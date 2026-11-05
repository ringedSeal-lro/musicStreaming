package com.github.ringedSeal.musicStreaming.exceptions;

public class BadRequestException extends ApiException {
    public BadRequestException(String message) {
        super(org.springframework.http.HttpStatus.BAD_REQUEST, message);
    }
}
