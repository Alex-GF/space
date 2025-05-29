import container from '../config/container.js';
import UserService from '../services/UserService.js';
import { USER_ROLES } from '../types/models/User.js';

class UserController {
  private userService: UserService;

  constructor() {
    this.userService = container.resolve('userService');
    this.create = this.create.bind(this);
    this.authenticate = this.authenticate.bind(this);
    this.getAll = this.getAll.bind(this);
    this.getByUsername = this.getByUsername.bind(this);
    this.update = this.update.bind(this);
    this.destroy = this.destroy.bind(this);
    this.regenerateApiKey = this.regenerateApiKey.bind(this);
    this.changeRole = this.changeRole.bind(this);
  }

  async create(req: any, res: any) {
    try {
      const user = await this.userService.create(req.body, req.user);
      res.status(201).json(user);
    } catch (err: any) {
      if (err.name?.includes('ValidationError') || err.code === 11000) {
        res.status(422).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('permissions')) {
        res.status(403).send({ error: err.message });
      } else if (
        err.message.toLowerCase().includes('already') ||
        err.message.toLowerCase().includes('not found')
      ) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async authenticate(req: any, res: any) {
    try {
      const { username, password } = req.body;
      const userApiKey = await this.userService.authenticate(username, password);
      res.json({ apiKey: userApiKey });
    } catch (err: any) {
      res.status(401).send({ error: err.message });
    }
  }

  async getAll(req: any, res: any) {
    try {
      const users = await this.userService.getAllUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  async getByUsername(req: any, res: any) {
    try {
      const user = await this.userService.findByUsername(req.params.username);
      res.json(user);
    } catch (err: any) {
      res.status(404).send({ error: err.message });
    }
  }

  async update(req: any, res: any) {
    try {
      const user = await this.userService.update(req.params.username, req.body, req.user);
      res.json(user);
    } catch (err: any) {
      if (err.name?.includes('ValidationError') || err.code === 11000) {
        res.status(422).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('permissions')) {
        res.status(403).send({ error: err.message });
      }else if (
        err.message.toLowerCase().includes('already') ||
        err.message.toLowerCase().includes('not found')
      ) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async regenerateApiKey(req: any, res: any) {
    try {
      const newApiKey = await this.userService.regenerateApiKey(req.params.username);
      res.json({ apiKey: newApiKey });
    } catch (err: any) {
      if (
        err.message.toLowerCase().includes('already') ||
        err.message.toLowerCase().includes('not found')
      ) {
        res.status(404).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('permissions')) {
        res.status(403).send({ error: err.message });
      }else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async changeRole(req: any, res: any) {
    try {
      const { role } = req.body;
      if (!USER_ROLES.includes(role)) {
        return res.status(400).send({ error: 'Rol no válido' });
      }

      const user = await this.userService.changeRole(req.params.username, role, req.user);
      res.json(user);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('permissions')) {
        res.status(403).send({ error: err.message });
      }else if (
        err.message.toLowerCase().includes('already') ||
        err.message.toLowerCase().includes('not found')
      ) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async destroy(req: any, res: any) {
    try {
      await this.userService.destroy(req.params.username);
      res.status(204).send();
    } catch (err: any) {
      if (
        err.message.toLowerCase().includes('already') ||
        err.message.toLowerCase().includes('not found')
      ) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }
}

export default UserController;
