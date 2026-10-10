package com.sms.studentms_backend.controller;

import com.sms.studentms_backend.dto.SchoolClassRequest;
import com.sms.studentms_backend.service.CatalogService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {
    private final CatalogService catalog;
    public CatalogController(CatalogService catalog) { this.catalog = catalog; }
    @GetMapping public List<Map<String, Object>> get() { return catalog.getCatalog(); }
    @PutMapping("/classes")
    @PreAuthorize("hasRole('ADMIN')")
    public void save(@Valid @RequestBody SchoolClassRequest request) { catalog.saveClass(request); }
}
