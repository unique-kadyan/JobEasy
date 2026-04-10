package com.kaddy.autoapply.model.event;

public record AutoApplyJobQueuedEvent(String userId, String jobId, String autoApplyJobId) {}
