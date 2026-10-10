package com.sms.studentms_backend.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record SchoolClassRequest(@NotBlank @Size(max = 255) String name,
                                @NotBlank @Size(max = 255) String major,
                                @NotNull List<@NotBlank String> courseCodes) {}
