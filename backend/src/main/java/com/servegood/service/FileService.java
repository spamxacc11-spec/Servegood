package com.servegood.service;

import com.servegood.dto.CatalogDtos.FileDto;
import com.servegood.entity.StoredFile;
import com.servegood.entity.enums.FilePurpose;
import com.servegood.entity.enums.RoleName;
import com.servegood.exception.ApiException;
import com.servegood.repository.StoredFileRepository;
import com.servegood.repository.UserRepository;
import com.servegood.security.AuthUser;
import com.servegood.security.CurrentUser;
import com.servegood.service.storage.StorageService;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Validates uploads, stores the bytes via StorageService and keeps only metadata in PostgreSQL. */
@Service
public class FileService {

    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Map<String, String> ALLOWED = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp");

    private final StorageService storage;
    private final StoredFileRepository files;
    private final UserRepository users;
    private final CurrentUser currentUser;

    public FileService(StorageService storage, StoredFileRepository files, UserRepository users, CurrentUser currentUser) {
        this.storage = storage;
        this.files = files;
        this.users = users;
        this.currentUser = currentUser;
    }

    @Transactional
    public FileDto upload(MultipartFile file, FilePurpose purpose) {
        AuthUser user = currentUser.require();
        checkPurposeAllowed(user, purpose);
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Choose a file to upload");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.badRequest("File is larger than 5 MB");
        }
        String declared = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String detected;
        try (InputStream in = file.getInputStream()) {
            detected = sniff(in.readNBytes(12));
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded file");
        }
        // Trust the bytes, not the header: the declared type must match what the file actually is.
        if (detected == null || !detected.equals(declared.equals("image/jpg") ? "image/jpeg" : declared)) {
            throw ApiException.badRequest("Only JPEG, PNG or WebP images are accepted");
        }
        LocalDate today = LocalDate.now();
        String key = "%s/%d/%02d/%s.%s".formatted(purpose.name().toLowerCase(), today.getYear(), today.getMonthValue(),
                UUID.randomUUID(), ALLOWED.get(detected));
        String url;
        try (InputStream in = file.getInputStream()) {
            url = storage.store(key, in, file.getSize(), detected);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store upload", e);
        }
        StoredFile meta = new StoredFile();
        meta.setStorageKey(key);
        meta.setUrl(url);
        meta.setOriginalFilename(sanitize(file.getOriginalFilename()));
        meta.setContentType(detected);
        meta.setSizeBytes(file.getSize());
        meta.setPurpose(purpose);
        meta.setUploadedBy(users.getReferenceById(user.id()));
        files.save(meta);
        return new FileDto(meta.getId(), url, detected, meta.getSizeBytes(), purpose);
    }

    private static void checkPurposeAllowed(AuthUser user, FilePurpose purpose) {
        boolean allowed = switch (purpose) {
            case REVIEW, AVATAR -> true;
            case RESTAURANT, MENU_ITEM, ADVERTISEMENT -> user.has(RoleName.RESTAURANT_OWNER) || user.isAdmin();
            case HYGIENE_EVIDENCE -> user.has(RoleName.REVIEWER) || user.isAdmin();
        };
        if (!allowed) {
            throw ApiException.forbidden("You cannot upload files for that purpose");
        }
    }

    private static String sniff(byte[] head) {
        if (head.length >= 3 && (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (head.length >= 8 && (head[0] & 0xFF) == 0x89 && head[1] == 'P' && head[2] == 'N' && head[3] == 'G') {
            return "image/png";
        }
        if (head.length >= 12 && head[0] == 'R' && head[1] == 'I' && head[2] == 'F' && head[3] == 'F'
                && head[8] == 'W' && head[9] == 'E' && head[10] == 'B' && head[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private static String sanitize(String name) {
        if (name == null) {
            return null;
        }
        String clean = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        return clean.substring(0, Math.min(clean.length(), 255));
    }
}
