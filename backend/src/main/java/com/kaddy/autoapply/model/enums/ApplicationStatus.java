package com.kaddy.autoapply.model.enums;

import java.util.EnumSet;
import java.util.Set;

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
    },
    // Silently cleared from the jobs feed — never shown in search again,
    // never shown on the Applications page. Created by "Clear old search".
    DISMISSED {
        @Override public Set<ApplicationStatus> allowedTransitions() {
            return EnumSet.noneOf(ApplicationStatus.class);
        }
    };

    public abstract Set<ApplicationStatus> allowedTransitions();

    public boolean canTransitionTo(ApplicationStatus target) {
        return allowedTransitions().contains(target);
    }

    public boolean isTerminal() {
        return allowedTransitions().isEmpty();
    }

    public boolean isActive() {
        return this == APPLIED || this == INTERVIEWING;
    }

    public String displayLabel() {
        return switch (this) {
            case SAVED          -> "Saved";
            case APPLIED        -> "Applied";
            case INTERVIEWING   -> "Interviewing";
            case OFFERED        -> "Offer Received";
            case REJECTED       -> "Rejected";
            case WITHDRAWN      -> "Withdrawn";
            case NOT_INTERESTED -> "Not Interested";
            case DISMISSED      -> "Dismissed";
            default             -> this.name();
        };
    }
}
