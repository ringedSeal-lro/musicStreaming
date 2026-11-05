package com.github.ringedSeal.musicStreaming.models;

import jakarta.persistence.*;

@Entity
@Table(name = "app_setting")
public class Setting {

    @Id
    @Column(name = "setting_key")
    private String key;

    @Column(name = "setting_value", length = 4096)
    private String value;

    protected Setting() {}

    public Setting(String key, String value) {
        this.key = key;
        this.value = value;
    }

    public String getKey() { return key; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
