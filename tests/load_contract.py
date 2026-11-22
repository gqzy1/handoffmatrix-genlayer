"""Minimal GenVM host doubles for offline state-machine tests."""
import importlib.util
import sys
import types
from pathlib import Path


class UserError(Exception):
    pass


class Return:
    def __init__(self, value):
        self.calldata = value


def load(name):
    sdk = types.ModuleType("genlayer")
    identity = lambda fn: fn
    sdk.TreeMap = dict
    sdk.gl = types.SimpleNamespace(
        Contract=object,
        public=types.SimpleNamespace(write=identity, view=identity),
        message=types.SimpleNamespace(sender_address="0x123"),
        vm=types.SimpleNamespace(UserError=UserError, Return=Return),
    )
    sys.modules["genlayer"] = sdk
    path = Path(__file__).resolve().parents[1] / "contracts" / (name + ".py")
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def consensus(leader, validator):
    proposal = leader()
    if not validator(Return(proposal)):
        raise UserError("VALIDATOR_DISAGREED")
    return proposal
