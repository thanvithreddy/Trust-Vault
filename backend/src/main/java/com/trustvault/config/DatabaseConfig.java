package com.trustvault.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Slf4j
public class DatabaseConfig {

    @Value("${DATABASE_URL:#{null}}")
    private String databaseUrl;

    @Value("${spring.datasource.url:#{null}}")
    private String springDatasourceUrl;

    @Value("${spring.datasource.username:#{null}}")
    private String springDatasourceUsername;

    @Value("${spring.datasource.password:#{null}}")
    private String springDatasourcePassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        // 1. Neon Database URL format (postgres://user:password@host/database?sslmode=require)
        if (databaseUrl != null && !databaseUrl.isBlank() && databaseUrl.startsWith("postgres://")) {
            log.info("Configuring DataSource from Neon DATABASE_URL environment variable");
            try {
                URI uri = new URI(databaseUrl);
                String userInfo = uri.getUserInfo();
                String username = userInfo.split(":")[0];
                String password = userInfo.split(":")[1];
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();

                String jdbcUrl = String.format("jdbc:postgresql://%s:%d%s?sslmode=require", host, port, path);
                config.setJdbcUrl(jdbcUrl);
                config.setUsername(username);
                config.setPassword(password);
                config.setDriverClassName("org.postgresql.Driver");
            } catch (Exception e) {
                log.error("Failed to parse Neon DATABASE_URL, falling back to standard config", e);
            }
        } else if (springDatasourceUrl != null && !springDatasourceUrl.isBlank()) {
            config.setJdbcUrl(springDatasourceUrl);
            config.setUsername(springDatasourceUsername);
            config.setPassword(springDatasourcePassword);
            if (springDatasourceUrl.contains("postgresql")) {
                config.setDriverClassName("org.postgresql.Driver");
            }
        } else {
            // Fallback for isolated zero-config testing / dev
            log.info("No external PostgreSQL provided. Defaulting to embedded H2 in-memory storage.");
            config.setJdbcUrl("jdbc:h2:mem:trustvault;DB_CLOSE_DELAY=-1;MODE=PostgreSQL");
            config.setDriverClassName("org.h2.Driver");
            config.setUsername("sa");
            config.setPassword("");
        }

        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(20000);

        return new HikariDataSource(config);
    }
}
