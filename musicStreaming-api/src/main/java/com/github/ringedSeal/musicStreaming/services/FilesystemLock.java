package com.github.ringedSeal.musicStreaming.services;

import org.springframework.stereotype.Component;

import java.util.concurrent.locks.ReentrantLock;

/** Garante que scan e sync nunca rodem ao mesmo tempo. */
@Component
public class FilesystemLock {
    private final ReentrantLock lock = new ReentrantLock();

    public void lock() { lock.lock(); }
    public void unlock() { lock.unlock(); }
}
