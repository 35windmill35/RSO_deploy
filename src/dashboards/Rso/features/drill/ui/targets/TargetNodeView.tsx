import type { ComponentType } from "react";
import type { DrillNode } from "../../model/drillStore";
import type { DrillTarget, DrillTargetKind } from "../../model/targets";
import { CapacityView } from "./CapacityView";
import { CarsView } from "./CarsView";
import { DepartmentView } from "./DepartmentView";
import { EmployeeView } from "./EmployeeView";
import { PayrollView } from "./PayrollView";
import { SliceView } from "./SliceView";
import { StockView } from "./StockView";

type SliceKind = Exclude<DrillTargetKind, "metric">;

interface ViewProps<K extends SliceKind> {
  target: Extract<DrillTarget, { kind: K }>;
  node: DrillNode;
}

// Вид панели для каждого среза. Record по виду цели: новый вид без компонента
// не скомпилируется
const VIEWS: { [K in SliceKind]: ComponentType<ViewProps<K>> } = {
  department: DepartmentView,
  accountType: SliceView,
  paymentType: SliceView,
  capacity: CapacityView,
  mark: CarsView,
  model: CarsView,
  stockGroup: StockView,
  warehouse: StockView,
  stock: StockView,
  stockGroups: StockView,
  payroll: PayrollView,
  payrollDepartment: PayrollView,
  payrollPosition: PayrollView,
  payrollPositions: PayrollView,
  employee: EmployeeView,
};

interface TargetNodeViewProps {
  target: Extract<DrillTarget, { kind: SliceKind }>;
  node: DrillNode;
}

export function TargetNodeView({ target, node }: TargetNodeViewProps) {
  const View = VIEWS[target.kind] as ComponentType<ViewProps<SliceKind>>;
  return <View target={target as never} node={node} />;
}
