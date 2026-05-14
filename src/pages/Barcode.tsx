import { useState } from "react";
import {
  Button, Input, InputNumber, Form, Tabs, Alert, message, Spin, Select,
} from "antd";
import { BarcodeOutlined, PrinterOutlined, ScanOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { barcodePageService, priceGroupService } from "../api/services";
import { useQuery } from "@tanstack/react-query";

export default function Barcode() {
  const [activeTab, setActiveTab] = useState("generate");
  const [generateForm] = Form.useForm();
  const [printForm] = Form.useForm();
  const [scanForm] = Form.useForm();

  const [generateResult, setGenerateResult] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  const pGroupsQuery = useQuery({
    queryKey: ["price-groups-active"],
    queryFn: () => priceGroupService.getActive().then((r: any) => r.data?.result || []),
    staleTime: 300_000,
  });
  const pGroups: any[] = pGroupsQuery.data || [];

  const generateMutation = useMutation({
    mutationFn: (vals: any) => barcodePageService.generate(vals),
    onSuccess: (res) => { setGenerateResult(res.data); message.success("Barcode generated"); },
    onError: () => message.error("Failed to generate barcode"),
  });

  const printMutation = useMutation({
    mutationFn: (vals: any) => barcodePageService.print(vals),
    onSuccess: () => message.success("Print job sent"),
    onError: () => message.error("Failed to send print job"),
  });

  const scanMutation = useMutation({
    mutationFn: (vals: any) => barcodePageService.scan(vals),
    onSuccess: (res) => { setScanResult(res.data?.data || res.data); message.success("Barcode scanned"); },
    onError: () => { message.error("Barcode not found"); setScanResult(null); },
  });

  const card = (children: React.ReactNode) => (
    <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 24, maxWidth: 480 }}>
      {children}
    </div>
  );

  const detailRow = (label: string, val: any) => (
    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{val ?? "—"}</span>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Barcode</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Generate, print and scan product barcodes</div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => { setActiveTab(k); setGenerateResult(null); setScanResult(null); }}
        items={[
          {
            key: "generate",
            label: <span><BarcodeOutlined /> Generate</span>,
            children: card(
              <>
                <Form form={generateForm} layout="vertical"
                  onFinish={(vals) => generateMutation.mutate(vals)}>
                  <Form.Item name="productId" label="Product ID" rules={[{ required: true, message: "Required" }]}>
                    <Input placeholder="Enter product ID" />
                  </Form.Item>
                  <Form.Item name="quantity" label="Quantity">
                    <InputNumber min={1} style={{ width: "100%" }} placeholder="1" />
                  </Form.Item>
                  <Form.Item name="format" label="Format">
                    <Select placeholder="Default" allowClear
                      options={[
                        { value: "CODE128", label: "CODE128" },
                        { value: "EAN13", label: "EAN13" },
                        { value: "QR", label: "QR Code" },
                      ]}
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" icon={<BarcodeOutlined />}
                    loading={generateMutation.isPending} style={{ background: "#2563eb", width: "100%" }}>
                    Generate
                  </Button>
                </Form>

                {generateMutation.isError && (
                  <Alert type="error" message="Failed to generate barcode." style={{ marginTop: 16 }} />
                )}

                {generateResult && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Result</div>
                    {generateResult.barcodeUrl || generateResult.imageUrl ? (
                      <div style={{ textAlign: "center", padding: 16, background: "#f8fafc", borderRadius: 8 }}>
                        <img
                          src={generateResult.barcodeUrl || generateResult.imageUrl}
                          alt="barcode"
                          style={{ maxWidth: "100%", maxHeight: 120 }}
                        />
                      </div>
                    ) : (
                      <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                        {Object.entries(generateResult).map(([k, v]) =>
                          detailRow(k, String(v))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ),
          },
          {
            key: "print",
            label: <span><PrinterOutlined /> Print</span>,
            children: card(
              <>
                <Form form={printForm} layout="vertical"
                  onFinish={(vals) => printMutation.mutate(vals)}>
                  <Form.Item name="productId" label="Product ID" rules={[{ required: true, message: "Required" }]}>
                    <Input placeholder="Enter product ID" />
                  </Form.Item>
                  <Form.Item name="quantity" label="Quantity" rules={[{ required: true, message: "Required" }]}>
                    <InputNumber min={1} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="priceGroupId" label="Price Group">
                    <Select placeholder="Select price group" allowClear
                      options={pGroups.map((pg: any) => ({ value: pg.id, label: pg.name }))}
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" icon={<PrinterOutlined />}
                    loading={printMutation.isPending} style={{ background: "#059669", width: "100%" }}>
                    Send to Printer
                  </Button>
                </Form>
                {printMutation.isError && (
                  <Alert type="error" message="Failed to send print job." style={{ marginTop: 16 }} />
                )}
                {printMutation.isSuccess && (
                  <Alert type="success" message="Print job sent successfully." style={{ marginTop: 16 }} />
                )}
              </>
            ),
          },
          {
            key: "scan",
            label: <span><ScanOutlined /> Scan</span>,
            children: card(
              <>
                <Form form={scanForm} layout="vertical"
                  onFinish={(vals) => { setScanResult(null); scanMutation.mutate(vals); }}>
                  <Form.Item name="barcode" label="Barcode" rules={[{ required: true, message: "Required" }]}>
                    <Input
                      placeholder="Scan or type barcode…"
                      autoFocus
                      suffix={scanMutation.isPending ? <Spin size="small" /> : <ScanOutlined style={{ color: "#9ca3af" }} />}
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" icon={<ScanOutlined />}
                    loading={scanMutation.isPending} style={{ background: "#7c3aed", width: "100%" }}>
                    Lookup
                  </Button>
                </Form>

                {scanMutation.isError && (
                  <Alert type="error" message="Barcode not found." style={{ marginTop: 16 }} />
                )}

                {scanResult && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Product Found</div>
                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                      {detailRow("Name", scanResult.product?.name || scanResult.name)}
                      {detailRow("SKU", scanResult.product?.sku || scanResult.sku)}
                      {detailRow("Barcode", scanResult.barcode)}
                      {detailRow("Category", scanResult.product?.category?.name || scanResult.category?.name)}
                      {detailRow("Brand", scanResult.product?.brand?.name || scanResult.brand?.name)}
                      {(scanResult.product?.productPrices || scanResult.productPrices || []).map((pp: any) => (
                        detailRow(pp.priceGroup?.name || "Price", `₹${Number(pp.price).toLocaleString("en-IN")}`)
                      ))}
                    </div>
                  </div>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
