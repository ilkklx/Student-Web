package com.sms.studentms_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CourseAssignmentRequest(@NotNull @Size(max = 100) String teacherUsername,
                                      @Size(max = 255) String className) {}
