package com.github.ringedSeal.musicStreaming.dto;

/**
 * Uma operação no disco. Caminhos relativos à raiz ("" = raiz).
 *
 * @param type   MKDIR, MOVE, LINK (hardlink ou cópia), RMDIR
 * @param source origem (MOVE/LINK) ou null
 * @param target destino
 */
public record SyncOperationDTO(Type type, String source, String target) {
    public enum Type { MKDIR, MOVE, LINK, RMDIR }
}
