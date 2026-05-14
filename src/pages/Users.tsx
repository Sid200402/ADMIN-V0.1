import { useQuery } from "@tanstack/react-query";
import { Table, Tag, Spin, Alert } from "antd";
import api from "../api/axiosInstance";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const fetchUsers = async (): Promise<User[]> => {
  const { data } = await api.get("/users");
  return data;
};

const columns = [
  { title: "ID", dataIndex: "id", key: "id" },
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Email", dataIndex: "email", key: "email" },
  { title: "Role", dataIndex: "role", key: "role" },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: string) => (
      <Tag color={status === "active" ? "green" : "red"}>{status}</Tag>
    ),
  },
];

function Users() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  if (isLoading) return <Spin size="large" />;
  if (isError) return <Alert type="error" message="Failed to load users" />;

  return (
    <div>
      <h2>Users</h2>
      <Table columns={columns} dataSource={data} rowKey="id" />
    </div>
  );
}

export default Users;
