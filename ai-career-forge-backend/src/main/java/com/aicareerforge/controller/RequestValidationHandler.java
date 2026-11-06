package com.aicareerforge.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

/** Validation failures must never echo or log passwords, resumes, or chat text. */
@RestControllerAdvice
public class RequestValidationHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationError> invalidRequest(MethodArgumentNotValidException exception) {
        List<String> fields = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField()).distinct().sorted().toList();
        // Handle the exception here rather than passing it to Spring's default
        // resolver, whose warning includes rejected request-field values.
        return ResponseEntity.badRequest().body(new ValidationError("Invalid request", fields));
    }

    public record ValidationError(String error, List<String> fields) {}
}
