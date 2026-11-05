package com.github.ringedSeal.musicStreaming.util;

import java.text.Normalizer;
import java.util.Locale;

public final class Text {

    private Text() {}

    /** Minúsculas, sem acento e sem espaços nas pontas. Usado na busca. */
    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }

    /** Escapa curingas do LIKE (usar com {@code escape '\\'}). */
    public static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
