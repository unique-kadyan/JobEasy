package com.kaddy.autoapply.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kaddy.autoapply.config.FeatureConfig;
import com.kaddy.autoapply.exception.AiServiceException;
import com.kaddy.autoapply.exception.BadRequestException;
import com.kaddy.autoapply.exception.ResourceNotFoundException;
import com.kaddy.autoapply.model.MockInterviewSession;
import com.kaddy.autoapply.model.User;
import com.kaddy.autoapply.model.enums.FeatureType;
import com.kaddy.autoapply.repository.MockInterviewRepository;
import com.kaddy.autoapply.repository.UserRepository;
import com.kaddy.autoapply.security.SecurityUtils;
import com.kaddy.autoapply.service.ai.AiProviderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class InterviewPrepService {

    private static final Logger log = LoggerFactory.getLogger(InterviewPrepService.class);

    private static final String QUESTION_SYSTEM = """
            You are a senior technical recruiter and interview coach at a top-tier tech company.
            Generate a comprehensive set of interview questions for the given role and difficulty level.
            Return ONLY a JSON array with exactly this structure (no markdown, no extra text):
            [
              {
                "index": 1,
                "question": "<interview question>",
                "category": "<TECHNICAL|CORE_DEPTH|BEHAVIORAL|CULTURE_FIT|SCENARIO_BASED|SITUATIONAL|PROBLEM_SOLVING|SYSTEM_DESIGN>"
              }
            ]
            Category definitions:
            - TECHNICAL: Core technology and domain knowledge (languages, frameworks, tools)
            - CORE_DEPTH: Deep expert-level questions probing mastery of the primary stack
            - BEHAVIORAL: Past-behavior (STAR format) — leadership, conflict, failure, success
            - CULTURE_FIT: Values, collaboration style, growth mindset, team dynamics
            - SCENARIO_BASED: Hypothetical "what would you do if..." challenges specific to this role
            - SITUATIONAL: Real on-the-job situations they would face in this exact role
            - PROBLEM_SOLVING: Algorithmic thinking, debugging approaches, trade-off analysis
            - SYSTEM_DESIGN: Architecture, scalability, reliability (include for SENIOR and LEAD only)
            Generate 12-15 questions with a deliberate mix across all relevant categories.
            Make questions progressively harder. Tailor every question to the exact job title, company culture,
            and difficulty level. Avoid generic questions — be specific to the domain.""";

    private static final String EVALUATION_SYSTEM = """
            You are a brutally honest but constructive senior interview coach at a top-tier tech company.
            Evaluate every answer objectively — do not inflate scores. Most candidates score 40-65 overall.
            For each question-answer pair, score the answer and provide specific feedback.
            Return ONLY a JSON array with exactly this structure (no markdown, no extra text):
            [
              {
                "index": <same index as input>,
                "score": <0-10 integer>,
                "feedback": "<specific, actionable feedback pointing out exactly what was missing or wrong>",
                "idealAnswer": "<concise ideal answer showing what an excellent response looks like>"
              }
            ]
            Scoring guide: 0-3 = poor/incomplete, 4-6 = adequate with gaps, 7-8 = good, 9-10 = exceptional.
            After the array, return an overall summary as a single JSON object on the next line:
            {
              "overallScore": <0-100 integer — be honest, average candidate scores 40-65>,
              "strengths": "<2-3 concrete strengths demonstrated in the answers>",
              "improvements": "<2-3 critical areas that need immediate work>",
              "overallFeedback": "<honest 2-3 sentence paragraph on readiness for this role>",
              "gapAnalysis": "<1-2 paragraphs: compare what this role requires vs what the candidate demonstrated — be specific about which skills/knowledge are missing, which are partial, and which are solid>",
              "actionPlan": [
                "<Step 1: specific action — e.g. study topic X, build project Y, get certification Z>",
                "<Step 2: ...>",
                "<Step 3: ...>",
                "<Step 4: ...>",
                "<Step 5: ...>"
              ]
            }""";

    private final MockInterviewRepository mockInterviewRepository;
    private final UserRepository          userRepository;
    private final FeatureConfig           featureConfig;
    private final AiProviderFactory       aiProviderFactory;
    private final FeatureUsageService     featureUsageService;
    private final ObjectMapper            objectMapper;

    public InterviewPrepService(MockInterviewRepository mockInterviewRepository,
                                UserRepository userRepository,
                                FeatureConfig featureConfig,
                                AiProviderFactory aiProviderFactory,
                                FeatureUsageService featureUsageService,
                                ObjectMapper objectMapper) {
        this.mockInterviewRepository = mockInterviewRepository;
        this.userRepository          = userRepository;
        this.featureConfig           = featureConfig;
        this.aiProviderFactory       = aiProviderFactory;
        this.featureUsageService     = featureUsageService;
        this.objectMapper            = objectMapper;
    }

    // -----------------------------------------------------------------------
    // Start session — generate questions
    // -----------------------------------------------------------------------

    public record StartRequest(
            String jobTitle,
            String company,
            String jobDescription,
            String difficultyLevel  // ENTRY, MID, SENIOR, LEAD
    ) {}

    public MockInterviewSession startSession(String userId, StartRequest req) {
        User user = findUser(userId);

        if (!SecurityUtils.isAdmin() && !featureConfig.canAccessMockInterview(user.getSubscriptionTier())) {
            throw new BadRequestException(
                    "Mock interview requires a Gold or Platinum subscription. Please upgrade.");
        }

        String prompt = buildQuestionPrompt(req);
        AiProviderFactory.GenerationResult result =
                aiProviderFactory.generate(QUESTION_SYSTEM, prompt, AiProviderFactory.TaskType.COVER_LETTER);

        List<MockInterviewSession.QA> questions = parseQuestions(result.content(), req);

        MockInterviewSession session = new MockInterviewSession();
        session.setUserId(userId);
        session.setJobTitle(req.jobTitle());
        session.setCompany(req.company());
        session.setJobDescription(req.jobDescription());
        session.setDifficultyLevel(Optional.ofNullable(req.difficultyLevel()).orElse("MID"));
        session.setQuestionsAndAnswers(questions);
        session.setStatus("IN_PROGRESS");

        return mockInterviewRepository.save(session);
    }

    // -----------------------------------------------------------------------
    // Submit answers — evaluate and complete session
    // -----------------------------------------------------------------------

    public record SubmitRequest(List<AnswerEntry> answers) {}
    public record AnswerEntry(int index, String answer) {}

    public MockInterviewSession submitAnswers(String userId, String sessionId, SubmitRequest req) {
        MockInterviewSession session = findOwned(userId, sessionId);

        if ("COMPLETED".equals(session.getStatus())) {
            throw new BadRequestException("This interview session has already been completed.");
        }

        // Merge answers into QA list (LinkedHashMap preserves question ordering)
        Map<Integer, String> answerMap = new LinkedHashMap<>();
        req.answers().forEach(a -> answerMap.put(a.index(), a.answer()));

        List<MockInterviewSession.QA> withAnswers = session.getQuestionsAndAnswers().stream()
                .map(qa -> new MockInterviewSession.QA(
                        qa.index(), qa.question(), qa.category(),
                        qa.idealAnswer(), answerMap.getOrDefault(qa.index(), ""), qa.score(), qa.feedback()))
                .toList();

        // Build evaluation prompt
        String evalPrompt = buildEvaluationPrompt(session, withAnswers);
        AiProviderFactory.GenerationResult result =
                aiProviderFactory.generate(EVALUATION_SYSTEM, evalPrompt, AiProviderFactory.TaskType.REASONING);

        // Parse scores, feedback, ideal answers
        List<MockInterviewSession.QA> evaluated = parseEvaluation(withAnswers, result.content());

        // Parse overall summary — find the JSON object containing overallScore
        int overallScore = 0;
        String strengths = "", improvements = "", overallFeedback = "", gapAnalysis = "";
        List<String> actionPlan = List.of();

        // The summary may be a multi-line JSON object; extract from last '{' that contains overallScore
        String rawContent = result.content().trim();
        int summaryStart = rawContent.lastIndexOf("{\"overallScore\"");
        if (summaryStart < 0) summaryStart = rawContent.lastIndexOf("{\n  \"overallScore\"");
        if (summaryStart < 0) summaryStart = rawContent.lastIndexOf("{\r\n  \"overallScore\"");
        // fallback: scan lines for the opening of the summary block
        if (summaryStart < 0) {
            String[] lines = rawContent.split("\\r?\\n");
            int depth = 0; int blockStart = -1;
            for (int i = 0; i < lines.length; i++) {
                String t = lines[i].trim();
                if (t.startsWith("{") && t.contains("overallScore")) { blockStart = i; break; }
                if (blockStart < 0 && t.startsWith("{") && depth == 0) { blockStart = i; }
                depth += (int) t.chars().filter(c -> c == '{').count();
                depth -= (int) t.chars().filter(c -> c == '}').count();
            }
            if (blockStart >= 0) {
                summaryStart = rawContent.indexOf(lines[blockStart]);
            }
        }
        if (summaryStart >= 0) {
            String candidate = rawContent.substring(summaryStart);
            // Find matching closing brace
            int d = 0; int end = -1;
            for (int i = 0; i < candidate.length(); i++) {
                char c = candidate.charAt(i);
                if (c == '{') d++;
                else if (c == '}') { d--; if (d == 0) { end = i + 1; break; } }
            }
            String summaryJson = end > 0 ? candidate.substring(0, end) : candidate;
            try {
                Map<String, Object> summary = objectMapper.readValue(summaryJson, new TypeReference<Map<String, Object>>() {});
                overallScore    = ((Number) summary.getOrDefault("overallScore", 0)).intValue();
                strengths       = (String) summary.getOrDefault("strengths", "");
                improvements    = (String) summary.getOrDefault("improvements", "");
                overallFeedback = (String) summary.getOrDefault("overallFeedback", "");
                gapAnalysis     = (String) summary.getOrDefault("gapAnalysis", "");
                Object ap = summary.get("actionPlan");
                if (ap instanceof List<?> apList) {
                    actionPlan = apList.stream()
                            .filter(String.class::isInstance)
                            .map(String.class::cast)
                            .toList();
                }
            } catch (Exception e) {
                log.warn("Could not parse overall summary for session {}: {}", sessionId, e.getMessage());
                overallScore = (int) Math.round(
                        evaluated.stream().mapToInt(MockInterviewSession.QA::score).average().orElse(0) * 10);
            }
        }

        session.setQuestionsAndAnswers(evaluated);
        session.setOverallScore(overallScore);
        session.setStrengths(strengths);
        session.setImprovements(improvements);
        session.setOverallFeedback(overallFeedback);
        session.setGapAnalysis(gapAnalysis);
        session.setActionPlan(actionPlan);
        session.setStatus("COMPLETED");
        session.setCompletedAt(LocalDateTime.now());

        MockInterviewSession saved = mockInterviewRepository.save(session);

        // Record usage after successful completion
        featureUsageService.record(userId, FeatureType.MOCK_INTERVIEW_SESSION, sessionId);

        return saved;
    }

    // -----------------------------------------------------------------------
    // Listing and retrieval
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<MockInterviewSession> getSessions(String userId, int page, int size) {
        return mockInterviewRepository.findByUserIdOrderByStartedAtDesc(userId, PageRequest.of(page, size));
    }

    @Transactional(readOnly = true)
    public MockInterviewSession getSession(String userId, String sessionId) {
        return findOwned(userId, sessionId);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private String buildQuestionPrompt(StartRequest req) {
        return "Job Title: " + req.jobTitle() + "\n"
                + "Company: " + Optional.ofNullable(req.company()).orElse("Unknown") + "\n"
                + "Difficulty: " + Optional.ofNullable(req.difficultyLevel()).orElse("MID") + "\n"
                + Optional.ofNullable(req.jobDescription())
                        .filter(d -> !d.isBlank())
                        .map(d -> "Job Description:\n" + d + "\n")
                        .orElse("");
    }

    private String buildEvaluationPrompt(MockInterviewSession session, List<MockInterviewSession.QA> answered) {
        StringBuilder sb = new StringBuilder();
        sb.append("Job: ").append(session.getJobTitle())
          .append(" at ").append(session.getCompany()).append("\n\n");
        answered.forEach(qa -> {
            sb.append("Q").append(qa.index()).append(" [").append(qa.category()).append("]: ")
              .append(qa.question()).append("\n");
            sb.append("Answer: ").append(Optional.ofNullable(qa.userAnswer()).orElse("(no answer)")).append("\n\n");
        });
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private List<MockInterviewSession.QA> parseQuestions(String raw, StartRequest req) {
        String json = stripMarkdown(raw);
        try {
            List<Map<String, Object>> items = objectMapper.readValue(json, new TypeReference<>() {});
            return items.stream().map(item -> new MockInterviewSession.QA(
                    ((Number) item.getOrDefault("index", 0)).intValue(),
                    (String) item.getOrDefault("question", ""),
                    (String) item.getOrDefault("category", "TECHNICAL"),
                    null, null, 0, null
            )).toList();
        } catch (Exception e) {
            log.error("Failed to parse interview questions: {}", e.getMessage());
            throw new AiServiceException("Failed to generate interview questions. Please retry.");
        }
    }

    @SuppressWarnings("unchecked")
    private List<MockInterviewSession.QA> parseEvaluation(
            List<MockInterviewSession.QA> originals, String raw) {

        // Extract the JSON array part (before the summary line)
        String json = raw.trim();
        int lastBracket = json.lastIndexOf(']');
        if (lastBracket >= 0) json = json.substring(0, lastBracket + 1);
        json = stripMarkdown(json);

        Map<Integer, Map<String, Object>> evalMap = new LinkedHashMap<>();
        try {
            List<Map<String, Object>> items = objectMapper.readValue(json, new TypeReference<>() {});
            items.forEach(item -> {
                int idx = ((Number) item.getOrDefault("index", 0)).intValue();
                evalMap.put(idx, item);
            });
        } catch (Exception e) {
            log.warn("Failed to parse evaluation JSON: {}", e.getMessage());
        }

        return originals.stream().map(qa -> {
            Map<String, Object> eval = evalMap.getOrDefault(qa.index(), Map.of());
            return new MockInterviewSession.QA(
                    qa.index(), qa.question(), qa.category(),
                    (String) eval.getOrDefault("idealAnswer", ""),
                    qa.userAnswer(),
                    ((Number) eval.getOrDefault("score", 0)).intValue(),
                    (String) eval.getOrDefault("feedback", "")
            );
        }).toList();
    }

    private String stripMarkdown(String raw) {
        String s = raw.trim();
        if (s.startsWith("```")) {
            s = s.replaceAll("^```[a-zA-Z]*\\n?", "").replaceAll("```$", "").trim();
        }
        return s;
    }

    private MockInterviewSession findOwned(String userId, String sessionId) {
        return mockInterviewRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview session not found."));
    }

    private User findUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }
}
