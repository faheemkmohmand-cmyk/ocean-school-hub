import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface UserProfile {
  id: string; full_name: string | null; role: string; class: string | null;
  phone: string | null; avatar_url: string | null; created_at: string;
}

const AdminUsers = () => {
  const { data: users = [], isLoading } = useQuery<UserProfile[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-heading font-bold text-foreground">Registered Users</h2>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Avatar</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Class</TableHead><TableHead>Phone</TableHead><TableHead>Joined</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{(u.full_name || "U").charAt(0)}</div>}
                </TableCell>
                <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                <TableCell><span className="capitalize text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{u.role}</span></TableCell>
                <TableCell>{u.class ? `Class ${u.class}` : "—"}</TableCell>
                <TableCell className="text-sm">{u.phone || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AdminUsers;
