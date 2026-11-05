package com.github.ringedSeal.musicStreaming.exceptions;

public class ConflictException extends ApiException {
    public ConflictException(String message) {
        super(org.springframework.http.HttpStatus.CONFLICT, message);
    }
}
