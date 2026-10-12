package com.servegood;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ServeGoodApplication {

    public static void main(String[] args) {
        // Byte Buddy (Hibernate proxies) refuses JDKs newer than it was released against
        // unless told otherwise. Harmless on supported JDKs.
        System.setProperty("net.bytebuddy.experimental", "true");
        SpringApplication.run(ServeGoodApplication.class, args);
    }
}
