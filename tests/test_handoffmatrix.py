import json
import unittest
from unittest.mock import patch

from load_contract import UserError, consensus, load

module = load("handoffmatrix")
ACTION = "Switch packing label printer to B."
CHECK = "Scan the label and expect TEST-001."
ROLLBACK = "Switch packing label printer back to A."


class HandoffMatrixTests(unittest.TestCase):
    def setUp(self):
        module.gl.vm.run_nondet_unsafe = consensus
        self.contract = module.HandoffMatrix()

    def test_missing_then_corrected_and_closed(self):
        with patch.object(module, "assess", return_value={"action": ACTION, "verification": "", "rollback": ""}):
            self.contract.evaluate("printer", 1, ACTION)
        first = json.loads(self.contract.revision("0x123", "printer", 1))
        self.assertEqual(first["missing"], ["verification", "rollback"])
        with self.assertRaisesRegex(UserError, "NO_OPEN_REVISION"):
            self.contract.evaluate("printer", 3, ACTION)
        matrix = {"action": ACTION, "verification": CHECK, "rollback": ROLLBACK}
        note = " ".join(matrix.values())
        with patch.object(module, "assess", return_value=matrix):
            self.contract.evaluate("printer", 2, note)
        self.assertEqual(json.loads(self.contract.revision("0x123", "printer", 2))["status"], "READY")
        with self.assertRaisesRegex(UserError, "NO_OPEN_REVISION"):
            self.contract.evaluate("printer", 3, note)

    def test_disagreement_does_not_write(self):
        values = [
            {"action": ACTION, "verification": CHECK, "rollback": ""},
            {"action": ACTION, "verification": "", "rollback": ""},
        ]
        with patch.object(module, "assess", side_effect=values):
            with self.assertRaisesRegex(UserError, "VALIDATOR_DISAGREED"):
                self.contract.evaluate("printer", 1, ACTION + " " + CHECK)
        self.assertEqual(self.contract.revision("0x123", "printer", 1), "")
