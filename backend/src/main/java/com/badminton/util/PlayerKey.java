package com.badminton.util;

import java.util.Locale;

/**
 * One player under different spellings of the name: "Shi Yu Qi" and "Shi Yuqi" are the same player, so a
 * name is compared without case, spaces or punctuation. PlayerStatsRepository applies the same rule in SQL:
 * regexp_replace(lower(name), '[^[:alnum:]]+', '', 'g').
 */
public final class PlayerKey {

    private PlayerKey() {
    }

    public static String of(String name) {
        return name == null ? "" : name.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", "");
    }
}
