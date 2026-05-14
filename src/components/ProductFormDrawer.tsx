import { useCallback, useState, useEffect } from "react";
import { Drawer, Form, Input, InputNumber, Select, Button, Spin } from "antd";
import { PlusOutlined, EditOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import {
  productService, categoryService, brandService, masterBrandService,
  modelService, unitService, priceGroupService, storeService,
} from "../api/services";
import api from "../api/axiosInstance";
import SearchableAddSelect from "./SearchableAddSelect";

const DYNAMIC_FIELDS = [
  { key: "hasType",     label: "Type",          field: "type",        number: false },
  { key: "hasSize",     label: "Size",          field: "size",        number: false },
  { key: "hasColor",    label: "Color",         field: "color",       number: false },
  { key: "hasCapacity", label: "Capacity",      field: "capacity",    number: false },
  { key: "hasWeight",   label: "Weight",        field: "weight",      number: false },
  { key: "hasWarranty", label: "Warranty Days", field: "warrantyDays", number: true },
] as const;

const toUpper = (e: React.FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const s = el.selectionStart; const end = el.selectionEnd;
  el.value = el.value.toUpperCase();
  el.setSelectionRange(s, end);
};

interface Props {
  open: boolean;
  editItem: any | null;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

export default function ProductFormDrawer({ open, editItem, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [catConfig, setCatConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const priceGroupsQuery = useQuery({
    queryKey: ["price-groups-active"],
    queryFn: () => priceGroupService.getActive().then(r => r.data?.result || []),
    staleTime: 60_000,
  });

  const storesQuery = useQuery({
    queryKey: ["stores-active"],
    queryFn: () => storeService.search(),
    staleTime: 60_000,
  });

  const pGroups: any[] = priceGroupsQuery.data || [];
  const stores: any[]  = (storesQuery.data as any)?.data?.result || (storesQuery.data as any)?.data || storesQuery.data || [];

  const patchCache = (updated: any) =>
    qc.setQueriesData({ queryKey: ["products"] }, (old: any) => {
      if (!old?.result) return old;
      return { ...old, result: old.result.map((p: any) => p.id === updated.id ? { ...p, ...updated } : p) };
    });

  const createMutation = useMutation({
    mutationFn: (v: any) => productService.create(v),
    onSuccess: (res) => {
      const id = res.data?.id || res.data?.data?.id;
      message.success("Product created");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-stats"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      onClose(); form.resetFields(); setCatConfig(null);
      if (id) onSuccess(id);
    },
    onError: () => message.error("Failed to create product"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => productService.update(id, v),
    onSuccess: (res, vars) => {
      message.success("Product updated");
      const updated: any = res.data;
      if (updated?.id) patchCache(updated);
      qc.invalidateQueries({ queryKey: ["inventory"] });
      onClose(); form.resetFields(); setCatConfig(null);
      onSuccess(vars.id);
    },
    onError: () => message.error("Failed to update product"),
  });

  const handleCategorySelect = useCallback((id: string) => {
    if (!id) { setCatConfig(null); return; }
    categoryService.search("").then((items: any[]) => {
      setCatConfig(items.find((c: any) => c.id === id) || null);
    });
  }, []);

  const fillForm = useCallback((r: any) => {
    if (r.category?.id) handleCategorySelect(r.category.id);
    const priceMap: Record<string, number> = {};
    (r.productPrices || []).forEach((pp: any) => {
      priceMap[`pg_${pp.priceGroupId || pp.priceGroup?.id}`] = Number(pp.price);
    });
    form.setFieldsValue({
      name: r.name, description: r.description,
      categoryId: r.category?.id, brandId: r.brand?.id,
      masterBrandId: r.masterBrand?.id, modelId: r.model?.id,
      unitId: r.unit?.id, purchasePrice: Number(r.purchasePrice),
      lowStockAlert: r.lowStockAlert, manufacturer: r.manufacturer,
      type: r.type, size: r.size, color: r.color,
      capacity: r.capacity, weight: r.weight, warrantyDays: r.warrantyDays,
      ...priceMap,
    });
  }, [form, handleCategorySelect]);

  // fetch full product details when drawer opens for edit
  useEffect(() => {
    if (!open) return;
    if (!editItem?.id) { form.resetFields(); setCatConfig(null); return; }
    setLoading(true);
    api.get(`/product/admin/${editItem.id}`)
      .then(r => fillForm(r.data))
      .catch(() => message.error("Failed to load product"))
      .finally(() => setLoading(false));
  }, [open, editItem?.id]);

  const onFinish = (v: any) => {
    const priceGroups = pGroups
      .filter(pg => v[`pg_${pg.id}`] != null)
      .map(pg => ({ priceGroupId: pg.id, price: v[`pg_${pg.id}`] }));

    const payload: any = {
      name: v.name, description: v.description,
      categoryId: v.categoryId, brandId: v.brandId,
      masterBrandId: v.masterBrandId, modelId: v.modelId,
      unitId: v.unitId, purchasePrice: v.purchasePrice,
      lowStockAlert: v.lowStockAlert, manufacturer: v.manufacturer,
      type: v.type, size: v.size, color: v.color,
      capacity: v.capacity, weight: v.weight, warrantyDays: v.warrantyDays,
      priceGroups,
    };

    if (!editItem) {
      payload.stores = (v.storeIds || []).map((sid: string) => ({
        storeId: sid, stock: v[`stock_${sid}`] || 0,
        minStock: v[`minStock_${sid}`] || 0, costPrice: v.purchasePrice,
      }));
    }

    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    if (editItem) updateMutation.mutate({ id: editItem.id, ...payload });
    else          createMutation.mutate(payload);
  };

  const handleClose = () => { onClose(); form.resetFields(); setCatConfig(null); setLoading(false); };

  return (
    <Drawer
      open={open}
      title={editItem ? <><EditOutlined /> Edit Product</> : <><PlusOutlined /> New Product</>}
      onClose={handleClose} size="large" destroyOnHidden footer={null}
    >
      <Spin spinning={loading}>
      <Form form={form} layout="vertical" onFinish={onFinish}
        onValuesChange={changed => {
          if (changed.categoryId !== undefined) handleCategorySelect(changed.categoryId);
        }}
      >
        <Form.Item name="categoryId" label="Category" rules={[{ required: true, message: "Required" }]}>
          <SearchableAddSelect
            placeholder="Category" fetchFn={categoryService.search} tabIndex={1}
            createConfig={{
              label: "Category", createFn: categoryService.create,
              buildPayload: v => ({ name: v.name, hasType: "NO", hasSize: "NO", hasColor: "NO", hasCapacity: "NO", hasWeight: "NO", hasWarranty: "NO" }),
              onAfterCreate: item => handleCategorySelect(item.id),
            }}
          />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Form.Item name="masterBrandId" label="Master Brand">
            <SearchableAddSelect placeholder="Master Brand" allowClear fetchFn={masterBrandService.search} tabIndex={2}
              createConfig={{ label: "Master Brand", createFn: masterBrandService.create }} />
          </Form.Item>
          <Form.Item name="brandId" label="Brand" rules={[{ required: true, message: "Required" }]}>
            <SearchableAddSelect placeholder="Brand" fetchFn={brandService.search} tabIndex={3}
              createConfig={{ label: "Brand", createFn: brandService.create }} />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Form.Item name="modelId" label="Model">
            <SearchableAddSelect placeholder="Model (optional)" allowClear fetchFn={modelService.search} tabIndex={4}
              createConfig={{ label: "Model", createFn: modelService.create }} />
          </Form.Item>
          <Form.Item name="unitId" label="Unit" rules={[{ required: true, message: "Required" }]}>
            <SearchableAddSelect placeholder="Unit" fetchFn={unitService.search} tabIndex={5}
              createConfig={{
                label: "Unit", createFn: unitService.create,
                extraFields: (
                  <Form.Item name="shortName" label="Short Name" rules={[{ required: true, message: "Required" }]}>
                    <Input placeholder="e.g. PCS" onInput={toUpper} style={{ textTransform: "uppercase" }} />
                  </Form.Item>
                ),
                buildPayload: v => ({ name: v.name?.toUpperCase(), shortName: v.shortName?.toUpperCase() }),
              }}
            />
          </Form.Item>
        </div>

        <Form.Item name="name" label="Product Name">
          <Input tabIndex={6} placeholder="Auto-generated if empty" onInput={toUpper} style={{ textTransform: "uppercase" }} />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Form.Item name="lowStockAlert" label="Low Stock Alert">
            <InputNumber tabIndex={7} min={0} style={{ width: "100%" }} placeholder="e.g. 5" />
          </Form.Item>
          <Form.Item name="manufacturer" label="Manufacturer">
            <Input tabIndex={8} placeholder="e.g. Apple" onInput={toUpper} style={{ textTransform: "uppercase" }} />
          </Form.Item>
        </div>

        {catConfig && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            {DYNAMIC_FIELDS.map(({ key, label, field, number: isNum }, idx) =>
              catConfig[key] === "YES" ? (
                <Form.Item key={field} name={field} label={label} rules={[{ required: true, message: "Required" }]}>
                  {isNum
                    ? <InputNumber tabIndex={9 + idx} min={1} style={{ width: "100%" }} placeholder={label} />
                    : <Input tabIndex={9 + idx} placeholder={label} onInput={toUpper} style={{ textTransform: "uppercase" }} />
                  }
                </Form.Item>
              ) : null
            )}
          </div>
        )}

        <Form.Item name="description" label="Description">
          <Input.TextArea tabIndex={16} rows={2} placeholder="Optional" />
        </Form.Item>

        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>Pricing</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <Form.Item name="purchasePrice" label="Purchase Price" rules={[{ required: true, message: "Required" }]}>
              <InputNumber tabIndex={17} min={0.01} style={{ width: "100%" }} placeholder="e.g. 80000" prefix="₹" />
            </Form.Item>
            {pGroups.map((pg: any, idx: number) => (
              <Form.Item key={pg.id} name={`pg_${pg.id}`} label={pg.name}>
                <InputNumber tabIndex={18 + idx} min={0} style={{ width: "100%" }} placeholder="Price" prefix="₹" />
              </Form.Item>
            ))}
          </div>
        </div>

        {!editItem && stores.length > 0 && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>Store Assignment</div>
            <Form.Item name="storeIds" label="Stores" rules={[{ required: true, message: "Select at least 1 store" }]}>
              <Select mode="multiple" placeholder="Select stores" tabIndex={30}
                options={stores.map((s: any) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(p, c) => p.storeIds !== c.storeIds}>
              {({ getFieldValue }) => {
                const selected: string[] = getFieldValue("storeIds") || [];
                return selected.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                    {selected.map((sid: string, idx: number) => {
                      const s = stores.find((x: any) => x.id === sid);
                      return (
                        <div key={sid} style={{ background: "#fff", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>{s?.name}</div>
                          <Form.Item name={`stock_${sid}`} label="Initial Qty" style={{ marginBottom: 6 }}>
                            <InputNumber tabIndex={31 + idx * 2} min={0} style={{ width: "100%" }} placeholder="0" />
                          </Form.Item>
                          <Form.Item name={`minStock_${sid}`} label="Min Stock" style={{ marginBottom: 0 }}>
                            <InputNumber tabIndex={32 + idx * 2} min={0} style={{ width: "100%" }} placeholder="0" />
                          </Form.Item>
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              }}
            </Form.Item>
          </div>
        )}

        {editItem && (
          <Form.Item label="SKU">
            <Input value={editItem.sku} disabled />
          </Form.Item>
        )}

        <Button
          type="primary" htmlType="submit" block tabIndex={50}
          loading={createMutation.isPending || updateMutation.isPending}
          style={{ background: "#2563eb" }}
          icon={editItem ? <CheckCircleOutlined /> : <PlusOutlined />}
        >
          {editItem ? "Update Product" : "Create Product"}
        </Button>
      </Form>
      </Spin>
    </Drawer>
  );
}
