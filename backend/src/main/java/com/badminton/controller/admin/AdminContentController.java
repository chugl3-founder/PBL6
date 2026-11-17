package com.badminton.controller.admin;

import com.badminton.common.dto.MessageResponse;
import com.badminton.dto.admin.AdminHighlightResponse;
import com.badminton.dto.admin.AdminSharedReportResponse;
import com.badminton.dto.admin.PagedResponse;
import com.badminton.service.highlight.HighlightReelService;
import com.badminton.service.scouting.ScoutingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** What users make and share beyond matches: scouting share links and highlight reels. */
@RestController
@RequestMapping({"/api/admin/content", "/api/v1/admin/content"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminContentController {

    private final ScoutingService scoutingService;
    private final HighlightReelService highlightReelService;

    @GetMapping("/shared-reports")
    public ResponseEntity<PagedResponse<AdminSharedReportResponse>> sharedReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(scoutingService.listSharedForAdmin(page, Math.min(size, 200)));
    }

    @PostMapping("/shared-reports/{id}/revoke")
    public ResponseEntity<MessageResponse> revokeShare(@PathVariable Long id) {
        scoutingService.revokeShareForAdmin(id);
        return ResponseEntity.ok(new MessageResponse("Đã tắt link chia sẻ"));
    }

    @GetMapping("/highlights")
    public ResponseEntity<PagedResponse<AdminHighlightResponse>> highlights(
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(highlightReelService.listForAdmin(status, page, Math.min(size, 200)));
    }

    @DeleteMapping("/highlights/{id}")
    public ResponseEntity<MessageResponse> deleteHighlight(@PathVariable Long id) {
        highlightReelService.deleteForAdmin(id);
        return ResponseEntity.ok(new MessageResponse("Đã xóa video highlight"));
    }
}
