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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public class InterviewPrepService {

    private static final Logger log = LoggerFactory.getLogger(InterviewPrepService.class);

    private static final String QUESTION_SYSTEM = """
            You are an expert technical recruiter and interview coach.
            Generate a set of interview questions for the given job role and difficulty level.
            Return ONLY a JSON array with exactly this structure (no markdown, no extra text):
            [
              {
                "index": 1,
                "question": "<interview question>",
                "category": "<BEHAVIORAL|TECHNICAL|SITUATIONAL|CULTURE_FIT>"
              }
            ]
            Generate 8-10 questions with a balanced mix of categories.
            Tailor questions to the specific job title, company, and difficulty level provided.""";

    private static final String EVALUATION_SYSTEM = """
            You are an expert interview coach evaluating candidate answers.
            For each question-answer pair, score the answer and provide feedback.
            Return ONLY a JSON array with exactly this structure (no markdown, no extra text):
            [
              {
                "index": <same index as input>,
                "score": <0-10 integer>,
                "feedback": "<specific, actionable feedback>",
                "idealAnswer": "<concise ideal answer for this question>"
              }
            ]
            Be constructive but honest. Score 0-4 for poor, 5-7 for adequate, 8-10 for excellent answers.
            After the array, also return an overall summary in a separate JSON object on the next line:
            {"overallScore": <0-100>, "strengths": "<2-3 sentences>", "improvements": "<2-3 sentences>", "overallFeedback": "<paragraph>"}""";

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

        // Merge answers into QA list
        Map<Integer, String> answerMap = new java.util.HashMap<>();
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

        // Parse overall summary
        int overallScore = 0;
        String strengths = "", improvements = "", overallFeedback = "";
        try {
            String[] lines = result.content().trim().split("\n");
            for (int i = lines.length - 1; i >= 0; i--) {
                String line = lines[i].trim();
                if (line.startsWith("{") && line.contains("overallScore")) {
                    Map<String, Object> summary = objectMapper.readValue(line, new TypeReference<>() {});
                    overallScore   = ((Number) summary.getOrDefault("overallScore", 0)).intValue();
                    strengths      = (String) summary.getOrDefault("strengths", "");
                    improvements   = (String) summary.getOrDefault("improvements", "");
                    overallFeedback = (String) summary.getOrDefault("overallFeedback", "");
                    break;
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse overall summary for session {}: {}", sessionId, e.getMessage());
            // compute average from individual scores as fallback
            overallScore = (int) Math.round(
                    evaluated.stream().mapToInt(MockInterviewSession.QA::score).average().orElse(0) * 10);
        }

        session.setQuestionsAndAnswers(evaluated);
        session.setOverallScore(overallScore);
        session.setStrengths(strengths);
        session.setImprovements(improvements);
        session.setOverallFeedback(overallFeedback);
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

    public Page<MockInterviewSession> getSessions(String userId, int page, int size) {
        return mockInterviewRepository.findByUserIdOrderByStartedAtDesc(userId, PageRequest.of(page, size));
    }

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

        Map<Integer, Map<String, Object>> evalMap = new java.util.HashMap<>();
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
