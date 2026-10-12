package com.servegood.service.storage;

import java.io.IOException;
import java.io.InputStream;

/**
 * Where uploaded bytes live. The local implementation writes to disk for
 * development; a cloud implementation (S3, GCS, Azure Blob) only needs to
 * implement these two methods and be registered as the active bean.
 */
public interface StorageService {

    /** Stores the stream under {@code key} and returns the public URL it is served from. */
    String store(String key, InputStream content, long size, String contentType) throws IOException;

    void delete(String key) throws IOException;
}
