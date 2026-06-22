# project-staff Specification

## Purpose

TBD - created by archiving change project-management-system. Update Purpose after archive.

## Requirements

### Requirement: 從聯絡人清單加入工作人員

在專案編輯頁面中，使用者可以從系統通用聯絡人清單選取聯絡人，加入為該專案的工作人員。

#### Scenario: 成功加入工作人員

- **WHEN** 使用者在專案編輯頁面點擊「加入工作人員」，從彈出的聯絡人清單中選取一位聯絡人
- **THEN** 該聯絡人被加入專案工作人員清單，並顯示在編輯頁面中

#### Scenario: 不可重複加入同一位聯絡人

- **WHEN** 使用者嘗試加入已在該專案工作人員清單中的聯絡人
- **THEN** 系統提示「該聯絡人已是此專案的工作人員」，不重複加入

### Requirement: 移除工作人員

使用者可以從專案中移除已加入的工作人員。

#### Scenario: 成功移除工作人員

- **WHEN** 使用者在專案編輯頁面的工作人員清單中點擊某位成員的「移除」按鈕並確認
- **THEN** 該成員從此專案的工作人員關聯中移除，清單不再顯示

### Requirement: 檢視專案工作人員

在專案編輯頁面中顯示目前所有已加入的工作人員。

#### Scenario: 檢視工作人員清單

- **WHEN** 使用者進入某專案的編輯頁面
- **THEN** 頁面的工作人員區塊列出所有已加入的成員姓名、電子郵件、電話及「移除」按鈕
