package com.sms.studentms_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "majors")
@Getter @Setter @NoArgsConstructor
public class Major {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, nullable = false)
    private String name;
}
