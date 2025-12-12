import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Plus, Edit, Trash2, Users, Phone, Mail, CheckCircle, XCircle, AlertCircle, MoreVertical } from 'lucide-react';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBusiness } from '@/hooks/use-business';
import { useEmployees, Employee } from '@/hooks/use-employees';
import { usePlanLimits } from '@/hooks/use-plan-limits';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Link } from 'react-router-dom';

// Esquema de validação para o formulário de funcionário
const EmployeeSchema = z.object({
  name: z.string().min(1, "O nome do funcionário é obrigatório."),
  phone: z.string().optional(),
  email: z.string().email("Email inválido.").optional().or(z.literal("")),
});

type EmployeeFormValues = z.infer<typeof EmployeeSchema>;

const EmployeesPage: React.FC = () => {
  const { user } = useSession();
  const { business, isLoading: isBusinessLoading } = useBusiness();
  const { T } = useCurrency();
  const { 
    employees, 
    isLoading, 
    error,
    createEmployee, 
    updateEmployee, 
    deleteEmployee 
  } = useEmployees(business?.id || null);
  
  const { limits, isLoading: isLimitsLoading } = usePlanLimits();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(EmployeeSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  // Resetar formulário quando modal abrir/fechar ou employee mudar
  useEffect(() => {
    if (isModalOpen) {
      if (editingEmployee) {
        form.reset({
          name: editingEmployee.name,
          phone: editingEmployee.phone || "",
          email: editingEmployee.email || "",
        });
      } else {
        form.reset({
          name: "",
          phone: "",
          email: "",
        });
      }
    }
  }, [isModalOpen, editingEmployee, form]);

  // Abrir modal para criar novo funcionário
  const handleCreateClick = () => {
    // Verificar limite antes de abrir modal
    if (!limits.canCreateEmployee) {
      toast.error(
        T(
          `Você atingiu o limite de ${limits.maxEmployees} funcionário(s) do seu plano ${limits.planName === 'standard' ? 'Profissional' : limits.planName === 'teams' ? 'Negócio' : limits.planName}. Atualize para adicionar mais funcionários.`,
          `You have reached the limit of ${limits.maxEmployees} employee(s) for your ${limits.planName} plan. Upgrade to add more employees.`
        ),
        { duration: 6000 }
      );
      return;
    }
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar funcionário
  const handleEditClick = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  // Fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    form.reset();
  };

  // Submeter formulário
  const onSubmit = async (values: EmployeeFormValues) => {
    if (!business?.id) {
      toast.error(T("Negócio não encontrado.", "Business not found."));
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingEmployee) {
        // Atualizar funcionário existente
        const result = await updateEmployee(editingEmployee.id, {
          name: values.name,
          phone: values.phone,
          email: values.email,
        });

        if (result) {
          toast.success(T("Funcionário atualizado com sucesso!", "Employee updated successfully!"));
          handleCloseModal();
        }
      } else {
        // Verificar limite de funcionários antes de criar
        if (!limits.canCreateEmployee) {
          toast.error(
            T(
              `Você atingiu o limite de ${limits.maxEmployees} funcionário(s) do seu plano. Atualize para adicionar mais funcionários.`,
              `You have reached the limit of ${limits.maxEmployees} employee(s) for your plan. Upgrade to add more employees.`
            ),
            { duration: 5000 }
          );
          setIsSubmitting(false);
          return;
        }

        // Criar novo funcionário
        const result = await createEmployee({
          name: values.name,
          phone: values.phone,
          email: values.email,
        });

        if (result) {
          toast.success(T("Funcionário criado com sucesso!", "Employee created successfully!"));
          handleCloseModal();
        }
      }
    } catch (error: any) {
      toast.error(error.message || T("Erro ao salvar funcionário.", "Error saving employee."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle ativo/inativo
  const handleToggleActive = async (employee: Employee) => {
    if (!business?.id) return;

    setIsSubmitting(true);
    try {
      const result = await updateEmployee(employee.id, {
        is_active: !employee.is_active,
      });

      if (result) {
        toast.success(
          result.is_active 
            ? T("Funcionário ativado!", "Employee activated!")
            : T("Funcionário desativado!", "Employee deactivated!")
        );
      }
    } catch (error: any) {
      toast.error(error.message || T("Erro ao atualizar funcionário.", "Error updating employee."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir diálogo de confirmação de exclusão
  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  // Confirmar exclusão
  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;

    setIsSubmitting(true);
    try {
      const success = await deleteEmployee(employeeToDelete.id);
      if (success) {
        toast.success(T("Funcionário excluído com sucesso!", "Employee deleted successfully!"));
        setDeleteDialogOpen(false);
        setEmployeeToDelete(null);
      }
    } catch (error: any) {
      toast.error(error.message || T("Erro ao excluir funcionário.", "Error deleting employee."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBusinessLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostrar mensagem se a tabela não existe
  if (error && error.includes('Tabela employees não encontrada')) {
    return (
      <div className="space-y-6 pb-12">
        <section className="rounded-3xl bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-3 md:p-5 shadow-2xl flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{T('Configuração Necessária', 'Required Configuration')}</p>
              <h1 className="text-xl md:text-2xl font-extrabold mt-2 flex items-center gap-2">
                <Users className="h-6 w-6 md:h-7 md:w-7" />
                {T('Funcionários', 'Employees')}
              </h1>
            </div>
          </div>
        </section>

        <Card className="rounded-3xl border border-gray-200 shadow-xl p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold">{T('Migrations Não Executadas', 'Migrations Not Executed')}</h2>
            <p className="text-gray-600">
              {T('A tabela de funcionários ainda não foi criada no banco de dados. Execute as migrations no Supabase para ativar esta funcionalidade.', 'The employees table has not been created in the database yet. Run the migrations in Supabase to enable this feature.')}
            </p>
            <div className="bg-gray-50 p-4 rounded-lg text-left mt-4">
              <p className="font-semibold mb-2">{T('Como executar:', 'How to execute:')}</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>{T('Acesse o Supabase Dashboard', 'Access Supabase Dashboard')}</li>
                <li>{T('Vá em SQL Editor', 'Go to SQL Editor')}</li>
                <li>{T('Abra o arquivo EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql', 'Open the file EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql')}</li>
                <li>{T('Copie e cole o conteúdo no SQL Editor', 'Copy and paste the content into SQL Editor')}</li>
                <li>{T('Clique em Run para executar', 'Click Run to execute')}</li>
              </ol>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {T('Arquivo de migration:', 'Migration file:')} <code className="bg-gray-100 px-2 py-1 rounded">EXECUTAR_MIGRATIONS_FUNCIONARIOS.sql</code>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center p-10">
        <p className="text-gray-600 mb-4">
          {T("Você precisa cadastrar um negócio primeiro.", "You need to register a business first.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <Card className="rounded-3xl border border-gray-200 shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  {T('Funcionários / Atendentes', 'Employees / Staff')}
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {T('Gerencie os funcionários que atendem os clientes', 'Manage employees who serve customers')}
                </p>
              </div>
            </div>
            <Dialog open={isModalOpen} onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) {
                setEditingEmployee(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingEmployee(null);
                    setIsModalOpen(true);
                  }}
                  className="rounded-2xl w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{T('Adicionar Funcionário', 'Add Employee')}</span>
                  <span className="sm:hidden">{T('Adicionar', 'Add')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingEmployee 
                      ? T('Editar Funcionário', 'Edit Employee')
                      : T('Novo Funcionário', 'New Employee')
                    }
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Nome', 'Name')} *</FormLabel>
                          <FormControl>
                            <Input placeholder={T('Nome do funcionário', 'Employee name')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Telefone', 'Phone')}</FormLabel>
                          <FormControl>
                            <Input placeholder="(99) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Email', 'Email')}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={handleCloseModal}>
                          {T('Cancelar', 'Cancel')}
                        </Button>
                      </DialogClose>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {T('Salvando...', 'Saving...')}
                          </>
                        ) : (
                          editingEmployee 
                            ? T('Atualizar', 'Update')
                            : T('Criar', 'Create')
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Funcionários */}
      <Card className="rounded-3xl border border-gray-200 shadow-xl">
        <CardContent className="p-4 sm:p-6">
          {employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {T('Nenhum funcionário cadastrado ainda.', 'No employees registered yet.')}
              </p>
              <Button onClick={handleCreateClick} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {T('Adicionar Primeiro Funcionário', 'Add First Employee')}
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{T('Nome', 'Name')}</TableHead>
                      <TableHead>{T('Telefone', 'Phone')}</TableHead>
                      <TableHead>{T('Email', 'Email')}</TableHead>
                      <TableHead>{T('Status', 'Status')}</TableHead>
                      <TableHead className="text-right">{T('Ações', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>
                          {employee.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {employee.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="truncate max-w-[200px]">{employee.email}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.is_active ? "default" : "secondary"}>
                            {employee.is_active ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {T('Ativo', 'Active')}
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                {T('Inativo', 'Inactive')}
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(employee)}
                              disabled={isSubmitting}
                              title={employee.is_active ? T('Desativar', 'Deactivate') : T('Ativar', 'Activate')}
                            >
                              {employee.is_active ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(employee)}
                              title={T('Editar', 'Edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(employee)}
                              title={T('Excluir', 'Delete')}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {employees.map((employee) => (
                  <Card key={employee.id} className="border border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base truncate">{employee.name}</h3>
                            <Badge variant={employee.is_active ? "default" : "secondary"} className="flex-shrink-0">
                              {employee.is_active ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {T('Ativo', 'Active')}
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {T('Inativo', 'Inactive')}
                                </>
                              )}
                            </Badge>
                          </div>
                          
                          {employee.phone && (
                            <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{employee.phone}</span>
                            </div>
                          )}
                          
                          {employee.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{employee.email}</span>
                            </div>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(employee)}
                              disabled={isSubmitting}
                            >
                              {employee.is_active ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {T('Desativar', 'Deactivate')}
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  {T('Ativar', 'Activate')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(employee)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {T('Editar', 'Edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(employee)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {T('Excluir', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {T('Confirmar Exclusão', 'Confirm Deletion')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {T(
                `Tem certeza que deseja excluir o funcionário "${employeeToDelete?.name}"? Esta ação não pode ser desfeita.`,
                `Are you sure you want to delete employee "${employeeToDelete?.name}"? This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {T('Cancelar', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {T('Excluir', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeesPage;

