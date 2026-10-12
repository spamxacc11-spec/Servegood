package com.servegood.service.mail;

/**
 * Outbound email. The default implementation only logs; plug in an SMTP or
 * provider-backed implementation (e.g. via spring-boot-starter-mail) for production.
 */
public interface EmailSender {

    void send(String to, String subject, String body);
}
