package com.kaddy.autoapply.model.enums;

import java.util.EnumSet;
import java.util.Set;

/**
 * Application pipeline status with built-in state-machine rules.
 *
 * <p>Valid forward transitions:
 * <pre>
 *   SAVED ──────────────────────────────────────────► NOT_INTERESTED
 *   SAVED ──► APPLIED ──► INTERVIEWING ──► OFFERED ──► WITHDRAWN
 *                │              │              │
 *                └──────────────┴──────────────┴──► REJECTED
 * </pre>
 *
 * <p>Terminal states (OFFERED, REJECTED, WITHDRAWN, NOT_INTERESTED) cannot
 * be transitioned away from — they represent a closed outcome.
 */
public enum ApplicationStatus {

    SAVED {
        @Override public Set<ApplicationStatus> allowedTransitions() {
            return EnumSet.of(APPLIED, NOT_INTERESTED);
        }
    },
    APPLIED {
        @Override public Set<ApplicationStatus> allowedTransitions() {
            return EnumSet.of(INTERVIEWING, REJECTED, WITHDRAWN);
        }
    },
    INTERVIEWING {
        @Override public Set<ApplicationStatus> allowedTransitions() {
            return EnumSet.of(OFFERED, REJECTED, WITHDRAWN);
        }
    },
    OFFERED {
        @Override public Set<ApplicationStatus> allowedTransitions() {
            return EnumSet.noneOf(ApplicationStatus.class);
        }
    },
    REJECTED {
        @Override public Set<ApplicationStatus> allowedTransitions() {
            return EnumSet.noneOf(ApplicationStatus.class);
        }
    },
    WITHDRAWN {
        @Override public Set<ApplicationStatus> allowedTransitions() {
            return EnumSet.noneOf(ApplicationStatus.class);
        }
    },
    NOT_INTERESTED {
        @Override public Set<ApplicationStatus> allowedTransitions() {
            return EnumSet.noneOf(ApplicationStatus.class);
        }
    };

    /** Returns the set of states this status may legally transition to. */
    public abstract Set<ApplicationStatus> allowedTransitions();

    /**
     * Returns {@code true} when transitioning to {@code target} is permitted
     * by the pipeline rules.
     */
    public boolean canTransitionTo(ApplicationStatus target) {
        return allowedTransitions().contains(target);
    }

    /**
     * A terminal status represents a closed outcome — no further action is
     * expected and no forward transition is possible.
     */
    public boolean isTerminal() {
        return allowedTransitions().isEmpty();
    }

    /**
     * An active status means the application is still in-flight and the user
     * is awaiting a response.
     */
    public boolean isActive() {
        return this == APPLIED || this == INTERVIEWING;
    }

    /** Human-readable label used for display and analytics grouping. */
    public String displayLabel() {
        return switch (this) {
            case SAVED          -> "Saved";
            case APPLIED        -> "Applied";
            case INTERVIEWING   -> "Interviewing";
            case OFFERED        -> "Offer Received";
            case REJECTED       -> "Rejected";
            case WITHDRAWN      -> "Withdrawn";
            case NOT_INTERESTED -> "Not Interested";
        };
    }
}
