package com.retailflow.modules.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class RealtimeEmitterManager {

    private static final Logger log = LoggerFactory.getLogger(RealtimeEmitterManager.class);
    private static final Long SSE_TIMEOUT = 300_000L; // 5 minutes

    // storeId -> Set of active SseEmitters
    private final Map<String, Set<SseEmitter>> storeEmitters = new ConcurrentHashMap<>();

    public SseEmitter registerClient(String storeId, String userId) {
        String effectiveStoreId = (storeId != null && !storeId.isBlank()) ? storeId : "store-1";
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        storeEmitters.computeIfAbsent(effectiveStoreId, k -> new CopyOnWriteArraySet<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(effectiveStoreId, emitter));
        emitter.onTimeout(() -> removeEmitter(effectiveStoreId, emitter));
        emitter.onError(e -> removeEmitter(effectiveStoreId, emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of(
                            "status", "CONNECTED",
                            "storeId", effectiveStoreId,
                            "userId", userId != null ? userId : "anonymous",
                            "timestamp", System.currentTimeMillis()
                    )));
        } catch (IOException e) {
            removeEmitter(effectiveStoreId, emitter);
        }

        log.debug("Registered SSE client for storeId: {}, userId: {}. Total listeners: {}",
                effectiveStoreId, userId, storeEmitters.get(effectiveStoreId).size());

        return emitter;
    }

    public void broadcastToStore(String storeId, String eventType, Object data) {
        String effectiveStoreId = (storeId != null && !storeId.isBlank()) ? storeId : "store-1";
        Set<SseEmitter> emitters = storeEmitters.get(effectiveStoreId);

        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        RealtimeEvent<Object> event = new RealtimeEvent<>(eventType, effectiveStoreId, data);

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventType)
                        .data(event));
            } catch (Exception e) {
                removeEmitter(effectiveStoreId, emitter);
            }
        }
    }

    public void broadcastToAllStores(String eventType, Object data) {
        for (String storeId : storeEmitters.keySet()) {
            broadcastToStore(storeId, eventType, data);
        }
    }

    private void removeEmitter(String storeId, SseEmitter emitter) {
        Set<SseEmitter> set = storeEmitters.get(storeId);
        if (set != null) {
            set.remove(emitter);
            if (set.isEmpty()) {
                storeEmitters.remove(storeId);
            }
        }
    }

    /**
     * Send heartbeat ping every 25 seconds to keep connections alive through HTTP proxies and firewalls
     */
    @Scheduled(fixedRate = 25_000)
    public void sendHeartbeat() {
        for (Map.Entry<String, Set<SseEmitter>> entry : storeEmitters.entrySet()) {
            for (SseEmitter emitter : entry.getValue()) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (Exception e) {
                    removeEmitter(entry.getKey(), emitter);
                }
            }
        }
    }

    public int getActiveListenerCount(String storeId) {
        Set<SseEmitter> set = storeEmitters.get(storeId);
        return set != null ? set.size() : 0;
    }
}
