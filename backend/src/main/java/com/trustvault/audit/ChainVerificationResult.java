package com.trustvault.audit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChainVerificationResult {
    private boolean valid;
    private int totalRecords;
    private UUID corruptedRecordId;
    private String details;
}
