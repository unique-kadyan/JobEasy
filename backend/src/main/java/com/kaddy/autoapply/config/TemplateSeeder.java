package com.kaddy.autoapply.config;

import com.kaddy.autoapply.model.Template;
import com.kaddy.autoapply.repository.TemplateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TemplateSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TemplateSeeder.class);

    private final TemplateRepository templateRepository;

    public TemplateSeeder(TemplateRepository templateRepository) {
        this.templateRepository = templateRepository;
    }

    @Override
    public void run(String... args) {
        try {
            if (!templateRepository.findByIsSystemTrue().isEmpty()) {
                return;
            }
        } catch (Exception e) {
            log.warn("Template seeding skipped — database unavailable at startup: {}", e.getMessage());
            return;
        }

        log.info("Seeding system cover letter templates...");

        try {
            templateRepository.saveAll(List.of(
            Template.builder()
                .name("Professional")
                .content("""
                        Dear Hiring Manager,

                        I am writing to express my strong interest in the {{jobTitle}} position at {{company}}. \
                        With my background in {{skills}}, I am confident in my ability to contribute effectively to your team.

                        {{body}}

                        I am particularly drawn to this opportunity because {{companyReason}}. My experience in \
                        {{relevantExperience}} has prepared me well for the challenges outlined in the job description.

                        I would welcome the opportunity to discuss how my skills align with your needs. \
                        Thank you for considering my application.

                        Sincerely,
                        {{userName}}""")
                .description("A professional and formal cover letter template")
                .isSystem(true)
                .build(),

            Template.builder()
                .name("Modern")
                .content("""
                        Hi {{hiringManager}},

                        I noticed your opening for a {{jobTitle}} at {{company}}, and I knew I had to reach out. \
                        Here's why I'm a great fit:

                        {{body}}

                        What excites me most about {{company}} is {{companyReason}}. I'd love to bring my \
                        {{skills}} expertise to help your team achieve its goals.

                        Let's chat! I'm available at your convenience.

                        Best,
                        {{userName}}""")
                .description("A modern and conversational cover letter template")
                .isSystem(true)
                .build(),

            Template.builder()
                .name("Technical")
                .content("""
                        Dear {{hiringManager}},

                        As a {{currentTitle}} with expertise in {{skills}}, I am excited to apply for the \
                        {{jobTitle}} role at {{company}}.

                        Technical Highlights:
                        {{body}}

                        I am drawn to {{company}} because {{companyReason}}. My hands-on experience with \
                        {{relevantExperience}} makes me well-suited for this position.

                        I look forward to discussing how my technical background can benefit your engineering team.

                        Regards,
                        {{userName}}""")
                .description("A technical-focused cover letter emphasising skills and experience")
                .isSystem(true)
                .build(),

            Template.builder()
                .name("Career Change")
                .content("""
                        Dear Hiring Manager,

                        I am writing to express my enthusiasm for the {{jobTitle}} position at {{company}}. \
                        While my background is in {{previousField}}, I have been actively building skills in \
                        {{skills}} and am eager to transition into this new chapter of my career.

                        {{body}}

                        What I bring from my previous experience is {{transferableSkills}}. Combined with my \
                        newly acquired skills in {{relevantExperience}}, I am confident I can add unique value \
                        to your team.

                        Thank you for considering my application. I would love the chance to demonstrate how my \
                        diverse background can contribute to {{company}}.

                        Sincerely,
                        {{userName}}""")
                .description("Ideal for career changers highlighting transferable skills")
                .isSystem(true)
                .build()
            ));
            log.info("Seeded 4 system templates.");
        } catch (Exception e) {
            log.warn("Template seeding failed — will retry on next startup: {}", e.getMessage());
        }
    }
}
