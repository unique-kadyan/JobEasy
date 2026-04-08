package com.kaddy.autoapply.config.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitFilterTest {

    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter();
    }

    // ── General endpoint (60 req/min) ─────────────────────────────────────────

    @Test
    void generalEndpoint_shouldAllowFirst60RequestsFromSameIp() throws Exception {
        for (int i = 0; i < 60; i++) {
            var req  = request("192.168.1.1", "/api/jobs/search");
            var res  = new MockHttpServletResponse();
            var chain = new MockFilterChain();

            filter.doFilterInternal(req, res, chain);

            assertEquals(200, res.getStatus(), "Request " + (i + 1) + " should be allowed");
            assertNotNull(chain.getRequest(), "Filter chain should have been called");
        }
    }

    @Test
    void generalEndpoint_shouldBlock61stRequestFromSameIp() throws Exception {
        // Exhaust the bucket
        for (int i = 0; i < 60; i++) {
            filter.doFilterInternal(
                    request("10.0.0.5", "/api/jobs/search"),
                    new MockHttpServletResponse(),
                    new MockFilterChain());
        }

        var res   = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilterInternal(request("10.0.0.5", "/api/jobs/search"), res, chain);

        assertEquals(429, res.getStatus());
        assertEquals("application/json", res.getContentType());
        assertTrue(res.getContentAsString().contains("429"));
        assertNull(chain.getRequest(), "Filter chain should NOT have been called");
    }

    // ── Auth endpoint (10 req/min) ────────────────────────────────────────────

    @Test
    void authEndpoint_shouldAllowFirst10Requests() throws Exception {
        for (int i = 0; i < 10; i++) {
            var req  = request("192.168.2.1", "/api/auth/login");
            var res  = new MockHttpServletResponse();
            var chain = new MockFilterChain();

            filter.doFilterInternal(req, res, chain);

            assertEquals(200, res.getStatus(), "Auth request " + (i + 1) + " should be allowed");
        }
    }

    @Test
    void authEndpoint_shouldBlock11thRequest() throws Exception {
        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(
                    request("10.0.0.9", "/api/auth/login"),
                    new MockHttpServletResponse(),
                    new MockFilterChain());
        }

        var res   = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilterInternal(request("10.0.0.9", "/api/auth/login"), res, chain);

        assertEquals(429, res.getStatus());
    }

    @Test
    void authEndpoint_shouldHaveSeparateBucketFromGeneralEndpoint() throws Exception {
        // Exhaust auth bucket
        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(
                    request("10.0.0.3", "/api/auth/signup"),
                    new MockHttpServletResponse(),
                    new MockFilterChain());
        }

        // General endpoint from same IP should still work
        var res   = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilterInternal(request("10.0.0.3", "/api/jobs/search"), res, chain);

        assertEquals(200, res.getStatus());
        assertNotNull(chain.getRequest());
    }

    // ── IP isolation ──────────────────────────────────────────────────────────

    @Test
    void differentIps_shouldHaveIndependentBuckets() throws Exception {
        // Exhaust IP A's auth bucket
        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(
                    request("1.2.3.4", "/api/auth/login"),
                    new MockHttpServletResponse(),
                    new MockFilterChain());
        }

        // IP B should still have a fresh bucket
        var res   = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilterInternal(request("5.6.7.8", "/api/auth/login"), res, chain);

        assertEquals(200, res.getStatus());
    }

    // ── X-Forwarded-For header ────────────────────────────────────────────────

    @Test
    void xForwardedFor_shouldBeUsedAsClientIp() throws Exception {
        var req = request("proxy-ip", "/api/auth/login");
        req.addHeader("X-Forwarded-For", "203.0.113.1, 10.0.0.1");

        var res   = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilterInternal(req, res, chain);

        assertEquals(200, res.getStatus());

        // Now exhaust the bucket for the forwarded IP
        for (int i = 1; i < 10; i++) {
            var r = request("another-proxy", "/api/auth/login");
            r.addHeader("X-Forwarded-For", "203.0.113.1");
            filter.doFilterInternal(r, new MockHttpServletResponse(), new MockFilterChain());
        }

        // 11th request from same forwarded IP should be blocked
        var req11 = request("another-proxy", "/api/auth/login");
        req11.addHeader("X-Forwarded-For", "203.0.113.1");
        var res11 = new MockHttpServletResponse();
        filter.doFilterInternal(req11, res11, new MockFilterChain());

        assertEquals(429, res11.getStatus());
    }

    @Test
    void xForwardedForWithSingleIp_shouldBeExtractedCorrectly() throws Exception {
        var req = request("proxy", "/api/jobs/search");
        req.addHeader("X-Forwarded-For", "198.51.100.42");

        var res   = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilterInternal(req, res, chain);

        assertEquals(200, res.getStatus());
    }

    @Test
    void remoteAddrUsedWhenNoXForwardedFor() throws Exception {
        var req = new MockHttpServletRequest("GET", "/api/jobs/search");
        req.setRemoteAddr("172.16.0.100");
        // No X-Forwarded-For header

        var res   = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        filter.doFilterInternal(req, res, chain);

        assertEquals(200, res.getStatus());
    }

    // ── Response body ─────────────────────────────────────────────────────────

    @Test
    void rateLimitedResponse_shouldContainJsonWithStatusAndMessage() throws Exception {
        for (int i = 0; i < 10; i++) {
            filter.doFilterInternal(
                    request("blocked-ip", "/api/auth/login"),
                    new MockHttpServletResponse(),
                    new MockFilterChain());
        }

        var res = new MockHttpServletResponse();
        filter.doFilterInternal(request("blocked-ip", "/api/auth/login"), res, new MockFilterChain());

        String body = res.getContentAsString();
        assertTrue(body.contains("\"status\":429"));
        assertTrue(body.contains("message"));
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private MockHttpServletRequest request(String remoteAddr, String path) {
        var req = new MockHttpServletRequest("GET", path);
        req.setRemoteAddr(remoteAddr);
        return req;
    }
}
