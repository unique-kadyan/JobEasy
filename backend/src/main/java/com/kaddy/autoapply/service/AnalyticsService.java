package com.kaddy.autoapply.service;

import com.kaddy.autoapply.dto.response.AnalyticsResponse;
import com.kaddy.autoapply.model.enums.ApplicationStatus;
import com.kaddy.autoapply.repository.ApplicationRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class AnalyticsService {

    private final ApplicationRepository applicationRepository;

    public AnalyticsService(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    public AnalyticsResponse getSummary(String userId) {
        long total        = applicationRepository.countByUserId(userId);
        long applied      = applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.APPLIED);
        long interviewing = applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.INTERVIEWING);
        long offered      = applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.OFFERED);
        long rejected     = applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.REJECTED);
        long withdrawn    = applicationRepository.countByUserIdAndStatus(userId, ApplicationStatus.WITHDRAWN);

        double responseRate = total > 0
                ? (double) (interviewing + offered + rejected) / total * 100
                : 0;

        Map<String, Long> byStatus = new LinkedHashMap<>();
        byStatus.put("APPLIED",      applied);
        byStatus.put("INTERVIEWING", interviewing);
        byStatus.put("OFFERED",      offered);
        byStatus.put("REJECTED",     rejected);
        byStatus.put("WITHDRAWN",    withdrawn);

        return new AnalyticsResponse(
                total, applied, interviewing, offered, rejected,
                Math.round(responseRate * 100.0) / 100.0,
                byStatus
        );
    }
}
