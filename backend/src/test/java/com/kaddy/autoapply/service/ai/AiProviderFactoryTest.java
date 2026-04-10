package com.kaddy.autoapply.service.ai;

import com.kaddy.autoapply.exception.AiServiceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiProviderFactoryTest {

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
        factory  = new AiProviderFactory(List.of(cerebras, groq, openai, claude),
                "CEREBRAS,GROQ,TOGETHER,MISTRAL,SAMBANOVA,NOVITA",
                "GEMINI,OPENAI,CLAUDE");
    }

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

        when(cerebras.generateText(any(), any())).thenReturn("from cerebras");

        var result = factory.generate("sys", "user", "UNKNOWN");

        assertEquals("CEREBRAS", result.providerName());
    }

    @Test
    void generate_shouldSkipPreferredWhenNotAvailable() {
        AiProvider unavailable = mockProvider("GROQ", false);
        factory = new AiProviderFactory(List.of(cerebras, unavailable, openai, claude),
                "CEREBRAS,GROQ,TOGETHER,MISTRAL,SAMBANOVA,NOVITA",
                "GEMINI,OPENAI,CLAUDE");
        when(cerebras.generateText(any(), any())).thenReturn("from cerebras");

        var result = factory.generate("sys", "user", "GROQ");

        assertEquals("CEREBRAS", result.providerName());
        verify(unavailable, never()).generateText(any(), any());
    }

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
        factory = new AiProviderFactory(List.of(unavailableCerebras, groq, openai, claude),
                "CEREBRAS,GROQ,TOGETHER,MISTRAL,SAMBANOVA,NOVITA",
                "GEMINI,OPENAI,CLAUDE");
        when(groq.generateText(any(), any())).thenReturn("from groq");

        var result = factory.generate("sys", "user", null);

        assertEquals("GROQ", result.providerName());
        verify(unavailableCerebras, never()).generateText(any(), any());
    }

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
        factory = new AiProviderFactory(List.of(),
                "CEREBRAS,GROQ,TOGETHER,MISTRAL,SAMBANOVA,NOVITA",
                "GEMINI,OPENAI,CLAUDE");

        assertThrows(AiServiceException.class,
                () -> factory.generate("sys", "user", null));
    }

    @Test
    void generationResult_shouldHoldContentAndProviderName() {
        when(cerebras.generateText("sys", "user")).thenReturn("hello world");

        var result = factory.generate("sys", "user", null);

        assertEquals("hello world", result.content());
        assertEquals("CEREBRAS", result.providerName());
    }

    private AiProvider mockProvider(String name, boolean available) {

        ClaudeAiProvider p = mock(ClaudeAiProvider.class);
        when(p.getName()).thenReturn(name);
        when(p.isAvailable()).thenReturn(available);
        return p;
    }
}
