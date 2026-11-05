package com.github.ringedSeal.musicStreaming.exceptions;

public class NotFoundException extends ApiException {
    public NotFoundException(String message) {
        super(org.springframework.http.HttpStatus.NOT_FOUND, message);
    }
}
