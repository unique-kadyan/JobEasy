package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiProviderFactoryTest {

    // ── Stub providers ────────────────────────────────────────────────────────

    private AiProvider cerebras;
    private AiProvider groq;
    private AiProvider openai;
    private AiProvider claude;

    private AiProviderFactory factory;

    @BeforeEach
    void setUp() {
        cerebras = mockProvider("CEREBRAS", true);
        groq     = mockProvider("GROQ", true);
        openai   = mockProvider("OPENAI", true);
        claude   = mockProvider("CLAUDE", true);
        factory  = new AiProviderFactory(List.of(cerebras, groq, openai, claude));
    }

    // ── Preferred provider ────────────────────────────────────────────────────

    @Test
    void generate_shouldUsePreferredProviderFirst() {
        when(groq.generateText(any(), any())).thenReturn("from groq");

        var result = factory.generate("sys", "user", "GROQ");

        assertEquals("from groq", result.content());
        assertEquals("GROQ", result.providerName());
        verify(cerebras, never()).generateText(any(), any());
    }

    @Test
    void generate_shouldFallThroughWhenPreferredFails() {
        when(groq.generateText(any(), any())).thenThrow(new AiServiceException("groq down"));
        when(cerebras.generateText(any(), any())).thenReturn("from cerebras");

        var result = factory.generate("sys", "user", "GROQ");

        assertEquals("CEREBRAS", result.providerName());
    }

    @Test
    void generate_shouldSkipPreferredWhenNotConfigured() {
        // "UNKNOWN" provider not in factory
        when(cerebras.generateText(any(), any())).thenReturn("from cerebras");

        var result = factory.generate("sys", "user", "UNKNOWN");

        assertEquals("CEREBRAS", result.providerName());
    }

    @Test
    void generate_shouldSkipPreferredWhenNotAvailable() {
        AiProvider unavailable = mockProvider("GROQ", false);
        factory = new AiProviderFactory(List.of(cerebras, unavailable, openai, claude));
        when(cerebras.generateText(any(), any())).thenReturn("from cerebras");

        var result = factory.generate("sys", "user", "GROQ");

        assertEquals("CEREBRAS", result.providerName());
        verify(unavailable, never()).generateText(any(), any());
    }

    // ── Free provider fallback chain ──────────────────────────────────────────

    @Test
    void generate_shouldTryFreeProvidersInOrder() {
        when(cerebras.generateText(any(), any())).thenThrow(new AiServiceException("cerebras down"));
        when(groq.generateText(any(), any())).thenReturn("from groq");

        var result = factory.generate("sys", "user", null);

        assertEquals("GROQ", result.providerName());
        verify(cerebras).generateText(any(), any());
        verify(groq).generateText(any(), any());
    }

    @Test
    void generate_shouldSkipUnavailableFreeProviders() {
        AiProvider unavailableCerebras = mockProvider("CEREBRAS", false);
        factory = new AiProviderFactory(List.of(unavailableCerebras, groq, openai, claude));
        when(groq.generateText(any(), any())).thenReturn("from groq");

        var result = factory.generate("sys", "user", null);

        assertEquals("GROQ", result.providerName());
        verify(unavailableCerebras, never()).generateText(any(), any());
    }

    // ── Premium fallback ──────────────────────────────────────────────────────

    @Test
    void generate_shouldEscalateToPremiumOnlyWhenAllFreeFail() {
        when(cerebras.generateText(any(), any())).thenThrow(new AiServiceException("down"));
        when(groq.generateText(any(), any())).thenThrow(new AiServiceException("down"));
        when(openai.generateText(any(), any())).thenReturn("from openai");

        var result = factory.generate("sys", "user", null);

        assertEquals("OPENAI", result.providerName());
        verify(cerebras).generateText(any(), any());
        verify(groq).generateText(any(), any());
        verify(openai).generateText(any(), any());
        verify(claude, never()).generateText(any(), any());
    }

    @Test
    void generate_shouldTryNextPremiumWhenFirstFails() {
        when(cerebras.generateText(any(), any())).thenThrow(new AiServiceException("down"));
        when(groq.generateText(any(), any())).thenThrow(new AiServiceException("down"));
        when(openai.generateText(any(), any())).thenThrow(new AiServiceException("down"));
        when(claude.generateText(any(), any())).thenReturn("from claude");

        var result = factory.generate("sys", "user", null);

        assertEquals("CLAUDE", result.providerName());
    }

    // ── All providers fail ────────────────────────────────────────────────────

    @Test
    void generate_shouldThrowAiServiceExceptionWhenAllProvidersFail() {
        when(cerebras.generateText(any(), any())).thenThrow(new AiServiceException("down"));
        when(groq.generateText(any(), any())).thenThrow(new AiServiceException("down"));
        when(openai.generateText(any(), any())).thenThrow(new AiServiceException("down"));
        when(claude.generateText(any(), any())).thenThrow(new AiServiceException("down"));

        var ex = assertThrows(AiServiceException.class,
                () -> factory.generate("sys", "user", null));

        assertTrue(ex.getMessage().contains("All AI providers are currently unavailable"));
        assertEquals(503, ex.getStatusCode());
    }

    @Test
    void generate_shouldThrowWhenNoProvidersConfigured() {
        factory = new AiProviderFactory(List.of());

        assertThrows(AiServiceException.class,
                () -> factory.generate("sys", "user", null));
    }

    // ── GenerationResult record ───────────────────────────────────────────────

    @Test
    void generationResult_shouldHoldContentAndProviderName() {
        when(cerebras.generateText("sys", "user")).thenReturn("hello world");

        var result = factory.generate("sys", "user", null);

        assertEquals("hello world", result.content());
        assertEquals("CEREBRAS", result.providerName());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private AiProvider mockProvider(String name, boolean available) {
        // AiProvider is sealed — mock the concrete non-sealed ClaudeAiProvider instead
        ClaudeAiProvider p = mock(ClaudeAiProvider.class);
        when(p.getName()).thenReturn(name);
        when(p.isAvailable()).thenReturn(available);
        return p;
    }
}
