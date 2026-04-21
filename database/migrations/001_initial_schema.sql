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
-- Склады (собственные)
-- ---------------------------------------------------------------
CREATE TABLE warehouses (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    address     TEXT,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Подсклады маркетплейсов (Ozon, Wildberries и т.д.)
-- У каждого маркетплейса много складов — храним их здесь
CREATE TABLE sub_warehouses (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    marketplace     VARCHAR(30)     NOT NULL DEFAULT 'own',
    -- own | ozon | wildberries
    external_id     VARCHAR(100),   -- ID склада в системе маркетплейса
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
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
    sku         VARCHAR(100)    NOT NULL UNIQUE,
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
-- Справочник статусов закупок
-- ---------------------------------------------------------------
CREATE TABLE purchase_statuses (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100)    NOT NULL UNIQUE,
    color       VARCHAR(7),     -- HEX, напр. "#4CAF50"
    sort_order  INT             NOT NULL DEFAULT 0,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE
);

INSERT INTO purchase_statuses (name, color, sort_order) VALUES
    ('Черновик',              '#9E9E9E', 10),
    ('Согласование',          '#FF9800', 20),
    ('Подтверждено',          '#2196F3', 30),
    ('Отправлено поставщику', '#9C27B0', 40),
    ('Частично получено',     '#FF5722', 50),
    ('Получено',              '#4CAF50', 60),
    ('Отменено',              '#F44336', 70);

-- ---------------------------------------------------------------
-- Закупки
-- ---------------------------------------------------------------
CREATE TABLE purchases (
    id                      BIGSERIAL PRIMARY KEY,
    name                    VARCHAR(255)    NOT NULL,
    type                    VARCHAR(30)     NOT NULL DEFAULT 'purchase',
    -- purchase | return | movement | draft
    status_id               BIGINT          NOT NULL REFERENCES purchase_statuses(id),
    supplier_id             BIGINT          REFERENCES suppliers(id),
    manager_id              BIGINT          NOT NULL REFERENCES users(id),
    planned_warehouse_id    BIGINT          REFERENCES warehouses(id),
    export_date             DATE,
    export_time             TIME,
    ticket_number           VARCHAR(100),
    invoice_number          VARCHAR(100),   -- номер накладной во внешнем сервисе
    notes                   TEXT,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Прикреплённые файлы закупки
CREATE TABLE purchase_files (
    id              BIGSERIAL PRIMARY KEY,
    purchase_id     BIGINT          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    file_name       VARCHAR(255)    NOT NULL,
    file_path       TEXT            NOT NULL,
    uploaded_by     BIGINT          NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
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
-- Поступления (создаются автоматически при проведении закупки)
-- ---------------------------------------------------------------
CREATE TABLE receipts (
    id              BIGSERIAL PRIMARY KEY,
    purchase_id     BIGINT          NOT NULL REFERENCES purchases(id),
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
    purchase_line_id    BIGINT          NOT NULL REFERENCES purchase_lines(id),
    product_id          BIGINT          NOT NULL REFERENCES products(id),
    quantity_expected   NUMERIC(12, 3)  NOT NULL CHECK (quantity_expected >= 0),
    quantity_received   NUMERIC(12, 3)  NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Бронирования товаров из строк поступлений
-- Привязываются к подскладу маркетплейса (Ozon / WB / собственный)
-- В дальнейшем будут связаны со списаниями / заказами
-- ---------------------------------------------------------------
CREATE TABLE reservations (
    id                  BIGSERIAL PRIMARY KEY,
    receipt_line_id     BIGINT          NOT NULL REFERENCES receipt_lines(id) ON DELETE CASCADE,
    sub_warehouse_id    BIGINT          REFERENCES sub_warehouses(id),
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

CREATE INDEX ON sub_warehouses (marketplace);
CREATE INDEX ON product_categories (category_id);
CREATE INDEX ON product_properties (product_id);
CREATE INDEX ON product_properties (property_id);
CREATE INDEX ON purchases (status_id);
CREATE INDEX ON purchases (supplier_id);
CREATE INDEX ON purchases (manager_id);
CREATE INDEX ON purchases (type);
CREATE INDEX ON purchase_files (purchase_id);
CREATE INDEX ON purchase_lines (purchase_id);
CREATE INDEX ON purchase_lines (product_id);
CREATE INDEX ON receipts (purchase_id);
CREATE INDEX ON receipts (warehouse_id);
CREATE INDEX ON receipts (status);
CREATE INDEX ON receipt_lines (receipt_id);
CREATE INDEX ON receipt_lines (product_id);
CREATE INDEX ON reservations (receipt_line_id);
CREATE INDEX ON reservations (sub_warehouse_id);
CREATE INDEX ON reservations (status);
