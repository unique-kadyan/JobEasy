package com.kaddy.autoapply.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SalaryNormalizationService {

    private static final Map<String, Double> FX = Map.ofEntries(
            Map.entry("USD", 1.0),
            Map.entry("EUR", 1.10),
            Map.entry("GBP", 1.27),
            Map.entry("CAD", 0.74),
            Map.entry("AUD", 0.65),
            Map.entry("NZD", 0.60),
            Map.entry("CHF", 1.13),
            Map.entry("INR", 0.012),
            Map.entry("BRL", 0.20),
            Map.entry("MXN", 0.058),
            Map.entry("ARS", 0.0011),
            Map.entry("CLP", 0.0011),
            Map.entry("COP", 0.00025),
            Map.entry("PEN", 0.27),
            Map.entry("SGD", 0.75),
            Map.entry("HKD", 0.128),
            Map.entry("JPY", 0.0067),
            Map.entry("KRW", 0.00076),
            Map.entry("TWD", 0.032),
            Map.entry("CNY", 0.14),
            Map.entry("THB", 0.028),
            Map.entry("IDR", 0.000063),
            Map.entry("MYR", 0.22),
            Map.entry("PHP", 0.018),
            Map.entry("VND", 0.000041),
            Map.entry("AED", 0.27),
            Map.entry("SAR", 0.27),
            Map.entry("ILS", 0.27),
            Map.entry("TRY", 0.032),
            Map.entry("ZAR", 0.054),
            Map.entry("NGN", 0.00065),
            Map.entry("KES", 0.0077),
            Map.entry("GHS", 0.068),
            Map.entry("EGP", 0.020),
            Map.entry("MAD", 0.10),
            Map.entry("PLN", 0.25),
            Map.entry("SEK", 0.096),
            Map.entry("NOK", 0.093),
            Map.entry("DKK", 0.147),
            Map.entry("CZK", 0.044),
            Map.entry("HUF", 0.0028),
            Map.entry("RON", 0.22)
    );

    private static final Pattern RANGE_PATTERN =
            Pattern.compile("([\\d,._]+)\\s*(?:k|K|lpa|LPA)?\\s*[-–]\\s*([\\d,._]+)\\s*(?:k|K|lpa|LPA)?",
                    Pattern.CASE_INSENSITIVE);
    private static final Pattern SINGLE_PATTERN =
            Pattern.compile("([\\d,._]+)\\s*(?:k|K|lpa|LPA)?\\+?",
                    Pattern.CASE_INSENSITIVE);

    public Double toAnnualUsd(String salary) {
        if (salary == null || salary.isBlank()) return null;

        try {
            String s = salary.trim();
            String currency = detectCurrency(s);
            double fxRate = FX.getOrDefault(currency, 1.0);
            boolean isLpa = s.toLowerCase().contains("lpa");
            boolean isMonthly = s.toLowerCase().contains("month") || s.toLowerCase().contains("/mo");
            boolean isHourly = s.toLowerCase().contains("hour") || s.toLowerCase().contains("/hr")
                    || s.toLowerCase().contains("/h");

            Matcher rangeMatcher = RANGE_PATTERN.matcher(s);
            double raw;
            if (rangeMatcher.find()) {
                double lo = parseNumber(rangeMatcher.group(1));
                double hi = parseNumber(rangeMatcher.group(2));

                if (rangeMatcher.group(1).toLowerCase().contains("k")) lo *= 1000;
                if (rangeMatcher.group(2).toLowerCase().contains("k")) hi *= 1000;
                raw = (lo + hi) / 2.0;
            } else {
                Matcher single = SINGLE_PATTERN.matcher(s);
                if (!single.find()) return null;
                raw = parseNumber(single.group(1));
                if (single.group(1).toLowerCase().contains("k")) raw *= 1000;
            }

            if (isLpa) raw = raw * 100_000;

            double annual = isHourly ? raw * 2080
                    : isMonthly ? raw * 12
                    : raw;

            return annual * fxRate;
        } catch (Exception e) {
            return null;
        }
    }

    private String detectCurrency(String s) {
        if (s.contains("£") || s.toUpperCase().contains("GBP")) return "GBP";
        if (s.contains("€") || s.toUpperCase().contains("EUR")) return "EUR";
        if (s.contains("₹") || s.toUpperCase().contains("INR") || s.toUpperCase().contains("LPA")) return "INR";
        if (s.contains("$")) return s.toUpperCase().contains("CAD") ? "CAD"
                : s.toUpperCase().contains("AUD") ? "AUD"
                : s.toUpperCase().contains("SGD") ? "SGD" : "USD";
        if (s.toUpperCase().contains("CAD")) return "CAD";
        if (s.toUpperCase().contains("AUD")) return "AUD";
        if (s.toUpperCase().contains("SGD")) return "SGD";
        if (s.toUpperCase().contains("AED")) return "AED";
        return "USD";
    }

    private double parseNumber(String s) {
        return Double.parseDouble(s.replace(",", "").replace("_", "").replace(".", "")
                .replaceAll("[^0-9]", ""));
    }
}
