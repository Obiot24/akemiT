import { EntityRepository, Repository } from "typeorm";
import { User } from "../entity/user.entity";
import { Session } from "../entity/session.entity";
import { validate } from "class-validator";
import { getRepository } from "typeorm";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";

@EntityRepository(User)
export class AuthRepository extends Repository<User> {

    async login(email: string, password: string) {

        const userRepository = getRepository(User);
        let user: User;

        try {
            user = await userRepository.findOneOrFail({ where: { email } })
        } catch (e) {
            throw { message: 'Email or Password incorrect!!' };
        }

        if (!user.checkPassword(password)) {
            throw { message: 'Email or Password incorrect!!' };
        }

        const session = new Session();
        session.active = 1;
        session.expireAt = new Date();
        session.hash = randomBytes(12).toString('hex');
        session.ip = '';
        session.user_id = user.id!;

        const newSession = await this.manager.save(session);;

        return {
            hash: newSession.hash,
            expireAt: newSession.expireAt,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        };
    }

    async validate(email: string, hash: string) {      
        try {
            return (await getRepository(Session)
                .createQueryBuilder("session")
                .innerJoinAndSelect("session.user", "user")
                .where("session.hash = :hash", { hash: hash })
                .andWhere("user.email = :email", { email: email })
                .select("user.id")
                .getRawOne()).user_id;     
        } catch (e) {
            throw { message: 'Invalid token!!' };
        }
    }

}