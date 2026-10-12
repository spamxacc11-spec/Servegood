package com.servegood.controller;

/** Keeps client-supplied paging inside sane bounds. */
final class Paging {

    private Paging() {}

    static int page(Integer page) {
        return page == null || page < 0 ? 0 : Math.min(page, 10_000);
    }

    static int size(Integer size, int fallback) {
        return size == null || size < 1 ? fallback : Math.min(size, 100);
    }
}
