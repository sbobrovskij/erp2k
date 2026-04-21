-- =============================================================
-- ERP2K — начальная схема БД
-- PostgreSQL 15+
-- =============================================================

-- ---------------------------------------------------------------
-- Пользователи
-- ---------------------------------------------------------------
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255)        NOT NULL,
    email       VARCHAR(255)        NOT NULL UNIQUE,
    password    VARCHAR(255)        NOT NULL,
    role        VARCHAR(50)         NOT NULL DEFAULT 'operator',  -- admin | manager | operator
    is_active   BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Поставщики
-- ---------------------------------------------------------------
CREATE TABLE suppliers (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    legal_name      VARCHAR(255),
    inn             VARCHAR(20),
    contact_person  VARCHAR(255),
    phone           VARCHAR(50),
    email           VARCHAR(255),
    address         TEXT,
    notes           TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Склады
-- ---------------------------------------------------------------
CREATE TABLE warehouses (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    address     TEXT,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Ячейки склада — физические места хранения
CREATE TABLE warehouse_cells (
    id              BIGSERIAL PRIMARY KEY,
    warehouse_id    BIGINT          NOT NULL REFERENCES warehouses(id),
    code            VARCHAR(100)    NOT NULL,   -- напр. "A-01-03"
    description     VARCHAR(255),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (warehouse_id, code)
);

-- ---------------------------------------------------------------
-- Категории (дерево через parent_id)
-- ---------------------------------------------------------------
CREATE TABLE categories (
    id          BIGSERIAL PRIMARY KEY,
    parent_id   BIGINT          REFERENCES categories(id),
    name        VARCHAR(255)    NOT NULL,
    sort_order  INT             NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Товары
-- ---------------------------------------------------------------
CREATE TABLE products (
    id          BIGSERIAL PRIMARY KEY,
    sku         VARCHAR(100)    NOT NULL UNIQUE,  -- внутренний артикул
    name        VARCHAR(500)    NOT NULL,
    description TEXT,
    barcode     VARCHAR(100),
    unit        VARCHAR(20)     NOT NULL DEFAULT 'шт',
    weight_kg   NUMERIC(10, 3),
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Связки категорий с товарами (many-to-many)
CREATE TABLE product_categories (
    product_id      BIGINT  NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
    category_id     BIGINT  NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- ---------------------------------------------------------------
-- Свойства (характеристики: Цвет, Размер, Материал …)
-- ---------------------------------------------------------------
CREATE TABLE properties (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL UNIQUE,
    value_type  VARCHAR(20)     NOT NULL DEFAULT 'text',  -- text | number | boolean | select
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Значения свойств у товаров
CREATE TABLE product_properties (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT          NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
    property_id     BIGINT          NOT NULL REFERENCES properties(id)  ON DELETE CASCADE,
    value           TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, property_id)
);

-- ---------------------------------------------------------------
-- Закупки
-- ---------------------------------------------------------------
CREATE TABLE purchases (
    id              BIGSERIAL PRIMARY KEY,
    supplier_id     BIGINT          NOT NULL REFERENCES suppliers(id),
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    status          VARCHAR(30)     NOT NULL DEFAULT 'draft',
    -- draft | confirmed | partially_received | received | cancelled
    expected_date   DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Строки закупок
CREATE TABLE purchase_lines (
    id              BIGSERIAL PRIMARY KEY,
    purchase_id     BIGINT          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id      BIGINT          NOT NULL REFERENCES products(id),
    quantity        NUMERIC(12, 3)  NOT NULL CHECK (quantity > 0),
    price           NUMERIC(15, 2)  NOT NULL CHECK (price >= 0),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Поступления (фактическая приёмка товара на склад)
-- ---------------------------------------------------------------
CREATE TABLE receipts (
    id              BIGSERIAL PRIMARY KEY,
    purchase_id     BIGINT          REFERENCES purchases(id),   -- может быть без закупки
    warehouse_id    BIGINT          NOT NULL REFERENCES warehouses(id),
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    status          VARCHAR(30)     NOT NULL DEFAULT 'draft',
    -- draft | in_progress | completed | cancelled
    received_at     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Строки поступлений
CREATE TABLE receipt_lines (
    id                  BIGSERIAL PRIMARY KEY,
    receipt_id          BIGINT          NOT NULL REFERENCES receipts(id)       ON DELETE CASCADE,
    purchase_line_id    BIGINT          REFERENCES purchase_lines(id),         -- опционально
    product_id          BIGINT          NOT NULL REFERENCES products(id),
    quantity_expected   NUMERIC(12, 3)  NOT NULL CHECK (quantity_expected >= 0),
    quantity_received   NUMERIC(12, 3)  NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Бронирования товаров в ячейках строк поступлений
-- ---------------------------------------------------------------
CREATE TABLE reservations (
    id                  BIGSERIAL PRIMARY KEY,
    receipt_line_id     BIGINT          NOT NULL REFERENCES receipt_lines(id)   ON DELETE CASCADE,
    cell_id             BIGINT          NOT NULL REFERENCES warehouse_cells(id),
    quantity            NUMERIC(12, 3)  NOT NULL CHECK (quantity > 0),
    status              VARCHAR(30)     NOT NULL DEFAULT 'reserved',
    -- reserved | placed | released
    created_by          BIGINT          NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Индексы
-- =============================================================

CREATE INDEX ON warehouse_cells (warehouse_id);
CREATE INDEX ON product_categories (category_id);
CREATE INDEX ON product_properties (product_id);
CREATE INDEX ON product_properties (property_id);
CREATE INDEX ON purchases (supplier_id);
CREATE INDEX ON purchases (status);
CREATE INDEX ON purchase_lines (purchase_id);
CREATE INDEX ON purchase_lines (product_id);
CREATE INDEX ON receipts (purchase_id);
CREATE INDEX ON receipts (warehouse_id);
CREATE INDEX ON receipts (status);
CREATE INDEX ON receipt_lines (receipt_id);
CREATE INDEX ON receipt_lines (product_id);
CREATE INDEX ON reservations (receipt_line_id);
CREATE INDEX ON reservations (cell_id);
CREATE INDEX ON reservations (status);
