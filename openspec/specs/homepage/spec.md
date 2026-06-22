# homepage Specification

## Purpose

TBD - created by archiving change project-management-system. Update Purpose after archive.

## Requirements

### Requirement: 顯示品牌標題與標語

首頁需顯示系統品牌標題「CKES 專案管理系統」以及適合的標語。

#### Scenario: 首頁呈現

- **WHEN** 使用者進入系統首頁（`/`）
- **THEN** 頁面中央顯示「CKES 專案管理系統」標題，下方顯示標語「學校行政專案，智慧管理每一個環節」

#### Scenario: 已登入狀態的首頁

- **WHEN** 已登入的使用者進入首頁
- **THEN** 除了品牌標題與標語，頁面顯示快捷按鈕連結至「專案列表」與「聯絡人管理」
