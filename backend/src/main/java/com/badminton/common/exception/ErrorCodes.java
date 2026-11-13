package com.badminton.common.exception;

/** Error codes shared by several services. Codes used in one place only stay next to their check. */
public final class ErrorCodes {

    public static final String FORBIDDEN_ACCESS = "ERR_FORBIDDEN_ACCESS";
    public static final String USER_NOT_FOUND = "ERR_USER_NOT_FOUND";
    public static final String MATCH_NOT_FOUND = "ERR_MATCH_NOT_FOUND";
    public static final String VIDEO_NOT_FOUND = "ERR_VIDEO_NOT_FOUND";
    public static final String ANALYSIS_NOT_FOUND = "ERR_ANALYSIS_NOT_FOUND";
    public static final String ANALYSIS_MATCH_MISMATCH = "ERR_ANALYSIS_MATCH_MISMATCH";

    private ErrorCodes() {
    }
}
