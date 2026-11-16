package com.badminton.service.coach;

/**
 * Who is talking to the AI Coach. A guest has no email or user id; the tools then only see published matches.
 */
public record CoachCaller(String email, Long userId, boolean admin) {

    public static final CoachCaller GUEST = new CoachCaller(null, null, false);

    public boolean signedIn() {
        return userId != null;
    }
}
