import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface UserProfile {
  id: string; full_name: string | null; role: string; class: string | null;
  phone: string | null; avatar_url: string | null; created_at: string;
}

const roles = ["user", "student", "teacher", "admin"];

const AdminUsers = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Update failed"),
  });

  const filtered = search
    ? users.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search))
    : users;

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-heading font-bold text-foreground">User Management</h2>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Avatar</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Class</TableHead><TableHead>Phone</TableHead><TableHead>Joined</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(u => {
              const isSelf = u.id === user?.id;
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{(u.full_name || "U").charAt(0)}</div>}
                  </TableCell>
                  <TableCell className="font-medium">
                    {u.full_name || "—"}
                    {isSelf && <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>}
                  </TableCell>
                  <TableCell>
                    {isSelf ? (
                      <Badge className="capitalize">{u.role}</Badge>
                    ) : (
                      <Select value={u.role} onValueChange={v => updateRole.mutate({ id: u.id, role: v })}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>{roles.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>{u.class ? `Class ${u.class}` : "—"}</TableCell>
                  <TableCell className="text-sm">{u.phone || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminUsers;
