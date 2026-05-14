import { useState, useRef, useCallback, useEffect } from "react";
import { Select, Modal, Form, Input, message, Spin, Button, Divider } from "antd";
import { PlusOutlined } from "@ant-design/icons";

interface Item { id: string; name: string; [k: string]: any; }

interface Props {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  tabIndex?: number;
  fetchFn: (keyword?: string) => Promise<Item[]>;
  createConfig?: {
    label: string;
    createFn: (payload: any) => Promise<any>;
    extraFields?: React.ReactNode;
    buildPayload?: (v: any) => any;
    onAfterCreate?: (item: Item) => void;
  };
  style?: React.CSSProperties;
}

const toUpper = (e: React.FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const s = el.selectionStart; const end = el.selectionEnd;
  el.value = el.value.toUpperCase();
  el.setSelectionRange(s, end);
};

export default function SearchableAddSelect({
  value, onChange, placeholder, allowClear, disabled, autoFocus, tabIndex,
  fetchFn, createConfig, style,
}: Props) {
  const [options, setOptions]     = useState<{ value: string; label: string }[]>([]);
  const [fetching, setFetching]   = useState(false);
  const [searchText, setSearchText] = useState("");   // track what user typed
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form] = Form.useForm();
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selectRef = useRef<any>(null);

  const load = useCallback((kw?: string) => {
    setFetching(true);
    fetchFn(kw ?? "")
      .then(items => setOptions(items.map(i => ({ value: i.id, label: i.name }))))
      .catch(() => setOptions([]))
      .finally(() => setFetching(false));
  }, [fetchFn]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (kw: string) => {
    const upper = kw.toUpperCase();
    setSearchText(upper);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(upper), 300);
  };

  // open modal and pre-fill name with whatever was typed
  const openModal = () => {
    form.setFieldValue("name", searchText);
    setShowModal(true);
  };

  const handleCreate = async (v: any) => {
    if (!createConfig) return;
    setSaving(true);
    try {
      const payload = createConfig.buildPayload
        ? createConfig.buildPayload(v)
        : { name: v.name?.toUpperCase() };
      const res = await createConfig.createFn(payload);
      const d = res.data?.data || res.data;
      const newItem: Item = { id: d.id, name: d.name || v.name?.toUpperCase() };
      message.success(`${createConfig.label} created`);
      setOptions(prev => [{ value: newItem.id, label: newItem.name }, ...prev]);
      onChange?.(newItem.id);
      createConfig.onAfterCreate?.(newItem);
      setShowModal(false);
      form.resetFields();
      setSearchText("");
      setTimeout(() => selectRef.current?.focus(), 80);
    } catch {
      message.error(`Failed to create ${createConfig.label}`);
    } finally {
      setSaving(false);
    }
  };

  // "Not found" content — only spinner or plain no-results text
  const notFound = fetching
    ? <Spin size="small" />
    : <span style={{ color: "#9ca3af", fontSize: 12, padding: "4px 8px", display: "block" }}>No results — press Alt+Enter to add</span>;

  return (
    <>
      <Select
        ref={selectRef}
        value={value || undefined}
        onChange={onChange}
        onSearch={handleSearch}
        showSearch
        filterOption={false}
        placeholder={placeholder}
        allowClear={allowClear}
        disabled={disabled}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        notFoundContent={notFound}
        style={{ width: "100%", ...style }}
        options={options}
        // Alt+Enter or Insert → open Add modal from keyboard
        onInputKeyDown={e => {
          if ((e.altKey && e.key === "Enter") || e.key === "Insert") {
            e.preventDefault();
            if (createConfig) openModal();
          }
        }}
        popupRender={menu => (
          <>
            {menu}
            {createConfig && (
              <>
                <Divider style={{ margin: "4px 0" }} />
                <div style={{ padding: "4px 8px 6px" }}>
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    onMouseDown={e => e.preventDefault()}
                    onClick={openModal}
                    style={{ padding: 0, fontWeight: 600, color: "#2563eb", fontSize: 13 }}
                  >
                    Add {createConfig.label}
                    <span style={{
                      marginLeft: 8, fontSize: 10, color: "#9ca3af",
                      background: "#f1f5f9", border: "1px solid #e2e8f0",
                      borderRadius: 3, padding: "1px 4px", fontFamily: "monospace",
                    }}>
                      Alt+Enter
                    </span>
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      />

      {createConfig && (
        <Modal
          open={showModal}
          title={<><PlusOutlined /> Add {createConfig.label}</>}
          onCancel={() => { setShowModal(false); form.resetFields(); }}
          onOk={() => form.submit()}
          okText="Create"
          confirmLoading={saving}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Form.Item name="name" label="Name" rules={[{ required: true, message: "Required" }]}>
              <Input
                autoFocus
                onInput={toUpper}
                style={{ textTransform: "uppercase" }}
                placeholder={`e.g. ${createConfig.label.toUpperCase()}`}
              />
            </Form.Item>
            {createConfig.extraFields}
          </Form>
        </Modal>
      )}
    </>
  );
}
