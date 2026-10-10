package com.sms.studentms_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "app_migrations")
@Getter @Setter @NoArgsConstructor
public class MigrationMarker {
    @Id
    @Column(length = 100)
    private String name;

    public MigrationMarker(String name) { this.name = name; }
}
