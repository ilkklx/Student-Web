package com.sms.studentms_backend.config;

import com.sms.studentms_backend.repository.UserRepository;
import com.sms.studentms_backend.service.AccountService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("localdemo")
public class DemoAdminInitializer implements ApplicationRunner {
    private final UserRepository users;
    private final AccountService accounts;
    @Value("${app.demo-admin.username:demo_admin}") private String username;
    @Value("${app.demo-admin.password:Demo12345!}") private String password;

    public DemoAdminInitializer(UserRepository users, AccountService accounts) {
        this.users = users; this.accounts = accounts;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.findByUsername(username).isEmpty()) {
            accounts.createUser(username, password, "ROLE_ADMIN");
        }
    }
}
