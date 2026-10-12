package com.servegood.service.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Development stand-in: writes the email to the server log instead of sending
 * it. Password-reset links therefore appear in the backend console locally.
 */
@Service
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void send(String to, String subject, String body) {
        log.info("""

                ---- EMAIL (not sent: no mail provider configured) ----
                To: {}
                Subject: {}

                {}
                -------------------------------------------------------""", to, subject, body);
    }
}
