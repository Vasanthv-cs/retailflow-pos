package com.retailflow.modules.realtime;

import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/events")
public class NotificationEventController {

    private final RealtimeEmitterManager emitterManager;

    public NotificationEventController(RealtimeEmitterManager emitterManager) {
        this.emitterManager = emitterManager;
    }

    /**
     * Subscribes to real-time events for the specified store branch via Server-Sent Events (SSE).
     * Connect via EventSource in the frontend.
     */
    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(
            @RequestParam(required = false, defaultValue = "store-1") String storeId,
            Authentication authentication) {
        String userId = authentication != null ? authentication.getName() : "staff";
        return emitterManager.registerClient(storeId, userId);
    }

    @GetMapping("/active-listeners")
    public int getActiveListeners(@RequestParam(required = false, defaultValue = "store-1") String storeId) {
        return emitterManager.getActiveListenerCount(storeId);
    }
}
